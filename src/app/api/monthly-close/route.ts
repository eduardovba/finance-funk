import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import {
    getTargetMonth,
    generateTasksForMonth,
    getTasksForMonth,
    cleanupStaleTasks,
    completeTask,
    uncompleteTask,
    getFixedIncomeBalance,
    getAssetCurrency,
    suggestTasksForUser,
    addTemplate,
    removeTemplate,
} from '@/lib/monthlyCloseEngine';
import { run } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── GET: Fetch tasks for a month ──────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month') || getTargetMonth();
        const wantSuggestions = searchParams.get('suggestions') === 'true';

        // Always cleanup stale/invalid tasks (fast, runs every request)
        await cleanupStaleTasks(user.id);

        // Only generate tasks if none exist yet (so deleted tasks stay deleted)
        const existing = await getTasksForMonth(user.id, month);
        if (existing.length === 0) {
            await generateTasksForMonth(user.id, month);
        }

        const tasks = await getTasksForMonth(user.id, month);

        // Enrich with balance/currency info for the UI
        const enrichedTasks = await Promise.all(
            tasks.map(async (task) => {
                const enriched: Record<string, unknown> = { ...task };

                if (task.related_entity_id) {
                    enriched.currency = await getAssetCurrency(user.id, task.related_entity_id);

                    if (task.task_type === 'FIXED_INCOME_UPDATE') {
                        enriched.lastKnownBalance = await getFixedIncomeBalance(
                            user.id,
                            task.related_entity_id
                        );
                    }
                }

                return enriched;
            })
        );

        const response: Record<string, unknown> = {
            month,
            tasks: enrichedTasks,
            completed: enrichedTasks.filter((t) => t.is_completed).length,
            total: enrichedTasks.length,
        };

        // Include suggestions if requested
        if (wantSuggestions) {
            response.suggestions = await suggestTasksForUser(user.id);
        }

        // Include active assets for the asset picker
        const { query: dbQuery } = await import('@/lib/db');
        response.assets = await dbQuery<{ id: number; name: string; asset_class: string }>(
            `SELECT id, name, asset_class FROM assets WHERE user_id = ? AND sync_status = 'ACTIVE' ORDER BY name`,
            [user.id]
        );

        return NextResponse.json(response);
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Monthly close GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

// ─── PATCH: Toggle task completion ────────────────────────────────────

const PatchSchema = z.object({
    taskId: z.coerce.number(),
    is_completed: z.boolean(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody(PatchSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        if (data!.is_completed) {
            await completeTask(user.id, data!.taskId);
        } else {
            await uncompleteTask(user.id, data!.taskId);
        }

        return NextResponse.json({ success: true, taskId: data!.taskId, is_completed: data!.is_completed });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Monthly close PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

// ─── POST: Manage custom tasks and templates ──────────────────────────

const AddTaskSchema = z.object({
    action: z.literal('add_task'),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    label: z.string().min(1),
    is_recurring: z.boolean().optional().default(true),
    related_entity_id: z.coerce.number().optional(),
});

const AcceptSuggestionSchema = z.object({
    action: z.literal('accept_suggestion'),
    label: z.string().min(1),
    task_type: z.string().optional().default('CUSTOM'),
    related_entity_id: z.coerce.number().optional(),
});

const RemoveTemplateSchema = z.object({
    action: z.literal('remove_template'),
    templateId: z.coerce.number(),
});

const DeleteTaskSchema = z.object({
    action: z.literal('delete_task'),
    taskId: z.coerce.number(),
});

const UpdateTaskSchema = z.object({
    action: z.literal('update_task'),
    taskId: z.coerce.number(),
    label: z.string().min(1),
    related_entity_id: z.coerce.number().optional().nullable(),
});

const ReorderTasksSchema = z.object({
    action: z.literal('reorder_tasks'),
    tasks: z.array(z.object({
        id: z.coerce.number(),
        sort_order: z.coerce.number(),
    })),
});

const DismissSuggestionSchema = z.object({
    action: z.literal('dismiss_suggestion'),
    label: z.string().min(1),
});

const PostSchema = z.discriminatedUnion('action', [
    AddTaskSchema,
    AcceptSuggestionSchema,
    RemoveTemplateSchema,
    DeleteTaskSchema,
    UpdateTaskSchema,
    ReorderTasksSchema,
    DismissSuggestionSchema,
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody(PostSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const d = data!;

        if (d.action === 'add_task') {
            // Create template if recurring
            if (d.is_recurring) {
                await addTemplate(user.id, d.label);
            }

            // Create the task for this month
            await run(
                `INSERT INTO monthly_close_tasks
                 (user_id, month, task_type, related_entity_id, related_entity_name, is_recurring, custom_label)
                 SELECT ?, ?, 'CUSTOM', ?, ?, ?, ?
                 WHERE NOT EXISTS (
                     SELECT 1 FROM monthly_close_tasks WHERE user_id = ? AND month = ? AND custom_label = ?
                 )`,
                [user.id, d.month, d.related_entity_id ?? null, d.label, d.is_recurring ? 1 : 0, d.label, user.id, d.month, d.label]
            );

            return NextResponse.json({ success: true });
        }

        if (d.action === 'accept_suggestion') {
            // Create a template (recurring by default)
            await addTemplate(
                user.id,
                d.label,
                d.task_type ?? 'CUSTOM',
                d.related_entity_id ?? null
            );

            // Create the task for the current target month
            const month = getTargetMonth();
            await run(
                `INSERT OR IGNORE INTO monthly_close_tasks
                 (user_id, month, task_type, related_entity_id, related_entity_name, is_recurring, custom_label)
                 VALUES (?, ?, ?, ?, ?, 1, ?)`,
                [
                    user.id,
                    month,
                    d.task_type ?? 'CUSTOM',
                    d.related_entity_id ?? null,
                    d.label,
                    d.label,
                ]
            );

            return NextResponse.json({ success: true });
        }

        if (d.action === 'remove_template') {
            await removeTemplate(user.id, d.templateId);
            return NextResponse.json({ success: true });
        }

        if (d.action === 'delete_task') {
            await run(
                `DELETE FROM monthly_close_tasks WHERE id = ? AND user_id = ?`,
                [d.taskId, user.id]
            );
            return NextResponse.json({ success: true });
        }

        if (d.action === 'update_task') {
            await run(
                `UPDATE monthly_close_tasks
                 SET custom_label = ?, related_entity_name = ?, related_entity_id = ?
                 WHERE id = ? AND user_id = ?`,
                [d.label, d.label, d.related_entity_id ?? null, d.taskId, user.id]
            );
            return NextResponse.json({ success: true });
        }

        if (d.action === 'reorder_tasks') {
            const { query: dbQuery } = await import('@/lib/db');
            for (const t of d.tasks) {
                await dbQuery(
                    `UPDATE monthly_close_tasks SET sort_order = ? WHERE id = ? AND user_id = ?`,
                    [t.sort_order, t.id, user.id]
                );
            }
            return NextResponse.json({ success: true });
        }

        if (d.action === 'dismiss_suggestion') {
            await run(
                `INSERT OR IGNORE INTO monthly_close_dismissed_suggestions (user_id, label) VALUES (?, ?)`,
                [user.id, d.label]
            );
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Monthly close POST error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
