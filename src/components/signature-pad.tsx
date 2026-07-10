import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
};

export const SignaturePad = forwardRef<SignaturePadHandle, { className?: string }>(
  function SignaturePad({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const emptyRef = useRef(true);

    useEffect(() => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#111";
      };
      resize();
      let drawing = false;
      let last: { x: number; y: number } | null = null;
      const pos = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const down = (e: PointerEvent) => {
        drawing = true;
        emptyRef.current = false;
        last = pos(e);
        canvas.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!drawing || !last) return;
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last = p;
      };
      const up = () => {
        drawing = false;
        last = null;
      };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointerleave", up);
      return () => {
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointerleave", up);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        emptyRef.current = true;
      },
      isEmpty: () => emptyRef.current,
      toDataURL: () => canvasRef.current!.toDataURL("image/png"),
    }));

    return (
      <canvas
        ref={canvasRef}
        className={
          "w-full h-40 rounded-lg border-2 border-dashed bg-background touch-none " + (className ?? "")
        }
      />
    );
  },
);
