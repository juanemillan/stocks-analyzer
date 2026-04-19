export function BulliaLogo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <div className={`mx-auto mb-1 mr-1 flex items-center justify-center${className ? ` ${className}` : ''}`}>
      <img
        src={dark ? "/bullia-icon-light.svg" : "/bullia-icon-dark.svg"}
        alt="Bullia"
        className="w-10 h-10"
      />
    </div>
  );
}
