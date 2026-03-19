import React from 'react';
import { motion } from 'framer-motion';

export default function DesktopAssetTable({
    columns = [],
    data = [],
    onRowClick = null,
    selectedRowId = null,
    getRowId = (row) => row.id || row.asset || row.name
}) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-white/40 text-sm italic border border-white/5 rounded-xl bg-black/20">
                No assets found.
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto custom-scrollbar border border-white/5 rounded-xl bg-black/40 backdrop-blur-sm shadow-xl">
            <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[0.75rem] uppercase tracking-wider text-parchment/40 bg-white/[0.02] border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className={`px-4 py-3 font-space font-medium ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''}`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                    {data.map((row, rowIdx) => {
                        const rowId = getRowId(row);
                        const isSelected = selectedRowId === rowId;

                        return (
                            <motion.tr
                                key={rowId}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={`
                                    group transition-all duration-200 cursor-pointer
                                    ${isSelected
                                        ? 'bg-white/[0.08] relative'
                                        : 'hover:bg-white/[0.04]'
                                    }
                                `}
                                whileTap={{ scale: 0.995 }}
                            >
                                {/* Active Indicator Bar */}
                                {isSelected && (
                                    <td className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.6)] z-20" />
                                )}

                                {columns.map((col, colIdx) => {
                                    const rawValue = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                                    return (
                                        <td
                                            key={colIdx}
                                            className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''} ${isSelected ? 'bg-white/[0.02]' : ''}`}
                                        >
                                            {col.render ? col.render(rawValue, row) : rawValue}
                                        </td>
                                    );
                                })}
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
