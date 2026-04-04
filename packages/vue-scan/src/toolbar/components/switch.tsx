/** @jsxImportSource preact */
import type { HTMLAttributes } from 'preact';

interface SwitchProps extends HTMLAttributes<HTMLInputElement> {
    checked: boolean;
    onChange: (e: Event) => void;
    id?: string;
    title?: string;
}

export const Switch = ({ id, title, ...props }: SwitchProps) => (
    <label title={title} for={id} class="relative cursor-pointer block h-4 w-7 ring-1 ring-white/10 rounded-full bg-neutral-800 transition-colors [-webkit-tap-highlight-color:transparent] has-checked:bg-vue-green">
        <input type="checkbox" id={id} class="peer sr-only" {...props} />
        <span class="absolute top-0.5 start-0.5 size-3 rounded-full bg-white transition-[inset-inline-start] peer-checked:start-[14px]" />
    </label>
);
