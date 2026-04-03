export function BulliaLogo({ dark }: { dark: boolean }) {
  return (
    <div className="mx-auto mb-1 mr-1 flex items-center justify-center">
      <img
        src={dark ? "/bullia-icon-light.svg" : "/bullia-icon-dark.svg"}
        alt="Bullia"
        className="w-10 h-10"
      />
    </div>
  );
}
