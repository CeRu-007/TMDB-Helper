/**
 * 设置对话框的左侧导航菜单
 */

import { Database, Terminal, Film, Settings, Shield, HelpCircle, Palette } from 'lucide-react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';

interface SettingsMenuProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

interface MenuItem {
  id: string;
  labelKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  {
    id: 'model-service',
    labelKey: 'menu.modelService',
    descKey: 'menu.modelServiceDesc',
    icon: Database,
  },
  {
    id: 'tools',
    labelKey: 'menu.tools',
    descKey: 'menu.toolsDesc',
    icon: Terminal,
  },
  {
    id: 'video-thumbnail',
    labelKey: 'menu.videoThumbnail',
    descKey: 'menu.videoThumbnailDesc',
    icon: Film,
  },
  {
    id: 'appearance',
    labelKey: 'menu.appearance',
    descKey: 'menu.appearanceDesc',
    icon: Palette,
  },
  {
    id: 'general',
    labelKey: 'menu.general',
    descKey: 'menu.generalDesc',
    icon: Settings,
  },
  {
    id: 'security',
    labelKey: 'menu.security',
    descKey: 'menu.securityDesc',
    icon: Shield,
  },
  {
    id: 'help',
    labelKey: 'menu.help',
    descKey: 'menu.helpDesc',
    icon: HelpCircle,
  },
];

export function SettingsMenu({ activeSection, onSectionChange }: SettingsMenuProps) {
  const { t } = useTranslation('settings');

  const renderItem = (item: MenuItem, compact?: boolean) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onSectionChange(item.id)}
        className={`
          w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-colors
          ${
            isActive
              ? 'bg-primary text-primary-foreground ring-1 ring-primary/20 shadow-sm'
              : 'hover:bg-accent text-foreground ring-1 ring-transparent'
          }
        `}
      >
        <Icon
          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{t(item.labelKey)}</div>
          {!compact && (
            <div className="text-xs text-muted-foreground mt-0.5">{t(item.descKey)}</div>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      {/* ===== 桌面端：原始布局（完全不变） ===== */}
      <div className="max-md:hidden w-64 border-r bg-muted/50">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">{menuItems.map((item) => renderItem(item))}</div>
        </ScrollArea>
      </div>

      {/* ===== 移动端：紧凑列表 ===== */}
      <div className="hidden max-md:flex max-md:flex-col max-md:flex-1 border-b bg-muted/50">
        <div className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => renderItem(item, true))}
        </div>
      </div>
    </>
  );
}
