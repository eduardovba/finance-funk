import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAllUsers, getUserById } from '@/lib/users';
import { Users, Shield } from 'lucide-react';
import AdminUserTable from './AdminUserTable';
import styles from './admin.module.css';

export const metadata = {
    title: 'Admin | Finance Funk',
};

export default async function AdminPage() {
    const session = await auth();

    // Redirect if not logged in
    if (!session?.user?.id) {
        redirect('/login');
    }

    // Check admin status from DB (don't trust session alone for page-level guard)
    const dbUser = await getUserById(session.user.id);
    if (!dbUser?.is_admin) {
        redirect('/dashboard');
    }

    const users = await getAllUsers();
    const totalUsers = users.length;
    const adminCount = users.filter(u => u.is_admin).length;
    const isSuperAdmin = dbUser.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

    return (
        <div className={styles.adminContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>User Management</h1>
                <p className={styles.subtitle}>
                    {isSuperAdmin ? 'Super Admin' : 'Admin'} · Manage accounts and permissions
                </p>
            </div>

            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Users</div>
                    <div className={styles.statValue}>{totalUsers}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Admins</div>
                    <div className={styles.statValue}>{adminCount}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Regular Users</div>
                    <div className={styles.statValue}>{totalUsers - adminCount}</div>
                </div>
            </div>

            <AdminUserTable
                users={JSON.parse(JSON.stringify(users))}
                currentUserId={String(session.user.id)}
                isSuperAdmin={isSuperAdmin}
            />
        </div>
    );
}
