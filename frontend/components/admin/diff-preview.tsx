'use client';

// Diff preview component — color-coded new/amended/repealed articles with checkboxes
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { DiffItem } from '@/lib/admin-api-client';

const CHANGE_STYLES: Record<string, { badge: string; border: string }> = {
  new: { badge: 'bg-green-500/20 text-green-400', border: 'border-green-500/30' },
  amended: { badge: 'bg-yellow-500/20 text-yellow-400', border: 'border-yellow-500/30' },
  repealed: { badge: 'bg-red-500/20 text-red-400', border: 'border-red-500/30' },
};

const CHANGE_LABELS: Record<string, string> = {
  new: 'Mới',
  amended: 'Sửa đổi',
  repealed: 'Bãi bỏ',
};

interface DiffPreviewProps {
  changes: DiffItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function DiffPreview({
  changes,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: DiffPreviewProps) {
  if (changes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {changes.length} thay đổi — đã chọn {selected.length}
        </p>
        <div className="flex gap-3 text-sm">
          <button onClick={onSelectAll} className="text-purple-400 hover:underline">Chọn tất cả</button>
          <button onClick={onClearAll} className="text-muted-foreground hover:underline">Bỏ chọn</button>
        </div>
      </div>

      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {changes.map((item) => {
          const styles = CHANGE_STYLES[item.change_type] || CHANGE_STYLES.new;
          const isChecked = selected.includes(item.article_id);
          return (
            <div key={item.article_id} className={`border rounded-lg p-3 space-y-2 ${styles.border} bg-card`}>
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`art-${item.article_id}`}
                  checked={isChecked}
                  onCheckedChange={() => onToggle(item.article_id)}
                  className="mt-0.5"
                />
                <Label htmlFor={`art-${item.article_id}`} className="flex items-center gap-2 cursor-pointer">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
                    {CHANGE_LABELS[item.change_type] || item.change_type}
                  </span>
                  <span className="text-sm font-medium">Điều {item.article_id}</span>
                </Label>
              </div>

              {item.change_type === 'amended' && (
                <div className="ml-7 grid grid-cols-2 gap-2 text-xs">
                  {item.old_content && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                      <p className="font-semibold text-red-400 mb-1">Cũ</p>
                      <p className="text-muted-foreground line-clamp-4">{item.old_content}</p>
                    </div>
                  )}
                  {item.new_content && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                      <p className="font-semibold text-green-400 mb-1">Mới</p>
                      <p className="text-muted-foreground line-clamp-4">{item.new_content}</p>
                    </div>
                  )}
                </div>
              )}

              {item.change_type === 'new' && item.new_content && (
                <div className="ml-7 text-xs bg-green-500/10 border border-green-500/20 rounded p-2">
                  <p className="text-muted-foreground line-clamp-3">{item.new_content}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
