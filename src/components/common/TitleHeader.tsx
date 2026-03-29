type TitleHeaderProps = {
  title: string;
  sub: string;
};

const TitleHeader = ({ title, sub }: TitleHeaderProps) => {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-(--ai-badge-border) bg-(--ai-badge-bg) px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-(--ai-badge-text) shadow-[0_0_18px_rgba(99,102,241,0.2)]">
        <span className="text-base">💬</span>
        {sub}
      </div>
      <h1 className="text-3xl font-semibold text-(--ai-title-color) md:text-5xl">
        {title}
      </h1>
    </div>
  );
};

export default TitleHeader;
