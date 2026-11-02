type ToastType = "note" | "info" | "tip" | "warning" | "danger";

const toastIcons: Record<ToastType, string> = {
  note: '<span class="icon-[ph--tag-bold] text-lg"></span>',
  info: '<span class="icon-[ph--info-bold] text-lg"></span>',
  tip: '<span class="icon-[ph--lightbulb-bold] text-lg"></span>',
  warning: '<span class="icon-[ph--warning-bold] text-lg"></span>',
  danger: '<span class="icon-[ph--x-circle-bold] text-lg"></span>',
};

const toastColors: Record<ToastType, string> = {
  note: "var(--c-primary)",
  info: "var(--c-primary)",
  tip: "var(--c-accent, var(--c-primary))",
  warning: "#f59e0b",
  danger: "#ef4444",
};

export function showToast(message: string, type: ToastType = "info") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast toast-top toast-center z-[9999]";
    document.body.appendChild(container);
  }

  const container = document.getElementById("toast-container")!;

  const toast = document.createElement("div");
  toast.className = "alert";
  const iconColor = toastColors[type];
  toast.style.cssText = `
    background-color: var(--ld-bg-card);
    background-image: radial-gradient(circle at 4em -25em, ${iconColor}, transparent 30em), linear-gradient(${iconColor} -2000%, transparent);
    color: var(--c-text);
    border-radius: 0.5em;
    padding: 0.8em 1.2em;
    box-shadow: 0 4px 12px color-mix(in srgb, ${iconColor} 20%, transparent);
    transition: transform 0.2s, box-shadow 0.2s;
    font-size: 0.9em;
    min-width: fit-content;
    display: flex;
    align-items: center;
    gap: 0.5em;
  `;
  toast.innerHTML = `
    ${toastIcons[type]}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}
