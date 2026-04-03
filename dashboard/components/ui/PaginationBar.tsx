import { t } from "@/app/i18n";
import type { Lang } from "@/app/types";

export function PaginationBar({
  page,
  total,
  onPrev,
  onNext,
  lang,
}: {
  page: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  lang: Lang;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3 text-sm">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors duration-150"
      >
        {t("prev", lang)}
      </button>
      <span className="text-gray-500">
        {t("pageLabel", lang)} {page + 1} / {total}
      </span>
      <button
        onClick={onNext}
        disabled={page >= total - 1}
        className="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors duration-150"
      >
        {t("next", lang)}
      </button>
    </div>
  );
}
