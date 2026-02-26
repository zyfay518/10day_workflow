import React from 'react';
import * as LucideIcons from 'lucide-react';

export const iconMap: Record<string, string> = {
    'work': 'Briefcase',
    'auto_stories': 'BookOpen',
    'account_balance': 'Landmark',
    'payments': 'CreditCard',
    'health_and_safety': 'HeartPulse',
    'directions_run': 'Activity',
    'restaurant': 'Utensils',
    'nightlight': 'Moon',
    'emoji_events': 'Trophy',
    'psychology': 'Brain',
    'edit': 'Edit2',
    'add': 'Plus',
    'delete': 'Trash2',
    'settings': 'Settings',
    'home': 'Home',
    'flag': 'Flag',
    'history': 'History',
    'description': 'FileText',
    'receipt': 'Receipt',
    'attach_money': 'DollarSign',
    'laptop_mac': 'Laptop',
    'school': 'GraduationCap',
    'menu_book': 'Book',
    'fitness_center': 'Dumbbell',
    'self_improvement': 'Flower2',
    'local_cafe': 'Coffee',
    'flight_takeoff': 'Plane',
    'diversity_3': 'Users',
    'favorite': 'Heart',
    'star': 'Star',
    'bolt': 'Zap',
    'lightbulb': 'Lightbulb',
    'check_circle': 'CheckCircle2',
    'schedule': 'Clock',
    'event': 'Calendar',
    // Fallbacks
    'grid_view': 'LayoutGrid',
    'edit_square': 'PenSquare',
    'bar_chart': 'BarChart2',
};

interface DynamicIconProps extends Omit<LucideIcons.LucideProps, 'color'> {
    name: string;
    color?: string;
    className?: string;
}

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
    const lucideName = iconMap[name] || 'CircleDot';
    // @ts-ignore
    const Icon = LucideIcons[lucideName];

    if (!Icon) {
        return <LucideIcons.CircleDot {...props} />;
    }

    return <Icon {...props} />;
}
