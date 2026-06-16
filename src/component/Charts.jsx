import React, { useRef, useState } from 'react';

/**
 * Lightweight, dependency-free charts built with SVG/CSS so the admin bundle
 * stays lean. They are interactive via Pointer Events (mouse + touch unified):
 * the trend charts scrub a tooltip across data points, and the donut highlights
 * on hover and explodes a slice on click to reveal its share.
 */

const AxisLabels = ({ data, active = null }) => {
    const step = Math.max(1, Math.ceil(data.length / 5));
    return (
        <div className="flex gap-1 mt-2">
            {data.map((d, i) => (
                <div
                    key={i}
                    className={`flex-1 text-[10px] text-center truncate ${active === i ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}
                >
                    {active === i || i % step === 0 ? d.label : ''}
                </div>
            ))}
        </div>
    );
};

/** Tooltip anchored to a point inside a relative chart area (percent coords). */
const ChartTooltip = ({ left, top = 0, label, value }) => (
    <div
        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg whitespace-nowrap"
        style={{ left: `${left}%`, top: `${top}%`, marginTop: '-8px' }}
    >
        <div className="font-semibold leading-tight">{label}</div>
        <div className="leading-tight text-gray-300">{value}</div>
    </div>
);

/** Vertical bars for a short time series, with a scrubbing tooltip. */
export function TrendBars({ data = [], color = '#E91E63' }) {
    const ref = useRef(null);
    const [active, setActive] = useState(null);
    const n = data.length;
    const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));

    const locate = (e) => {
        const rect = ref.current.getBoundingClientRect();
        const i = Math.floor(((e.clientX - rect.left) / rect.width) * n);
        setActive(Math.max(0, Math.min(n - 1, i)));
    };

    return (
        // Pinned LTR: the time axis always flows left→right so the pointer/tooltip
        // math holds regardless of the page being RTL (Arabic) or LTR.
        <div className="relative" dir="ltr">
            <div
                ref={ref}
                className="relative flex h-40 items-end gap-1 touch-pan-y"
                onPointerMove={locate}
                onPointerDown={locate}
                onPointerLeave={() => setActive(null)}
            >
                {data.map((d, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col justify-end">
                        <div
                            className="w-full rounded-t-sm transition-all duration-150"
                            style={{
                                height: `${(Number(d.value) / max) * 100}%`,
                                minHeight: Number(d.value) > 0 ? '4px' : '0px',
                                backgroundColor: color,
                                opacity: active === null ? 0.85 : active === i ? 1 : 0.35,
                            }}
                        />
                    </div>
                ))}
                {active !== null && (
                    <ChartTooltip
                        left={((active + 0.5) / n) * 100}
                        top={(1 - Number(data[active].value) / max) * 100}
                        label={data[active].label}
                        value={data[active].value}
                    />
                )}
            </div>
            <AxisLabels data={data} active={active} />
        </div>
    );
}

/** Filled area + line for a short time series, with a guide line + point tooltip. */
export function TrendArea({ data = [], color = '#16A34A', gradientId = 'area-grad' }) {
    const ref = useRef(null);
    const [active, setActive] = useState(null);
    const n = data.length;
    const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));

    const pts = data.map((d, i) => ({
        x: n <= 1 ? 0 : (i / (n - 1)) * 100,
        y: 40 - (Number(d.value) / max) * 40,
    }));
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const area = `${line} L100,40 L0,40 Z`;

    const locate = (e) => {
        const rect = ref.current.getBoundingClientRect();
        const i = Math.round(((e.clientX - rect.left) / rect.width) * (n - 1));
        setActive(Math.max(0, Math.min(n - 1, i)));
    };

    const ap = active !== null ? pts[active] : null;

    return (
        // Pinned LTR: keep the time axis left→right (matches the SVG path) and
        // the scrub math correct under RTL pages.
        <div className="relative" dir="ltr">
            <div
                ref={ref}
                className="relative h-40 touch-pan-y"
                onPointerMove={locate}
                onPointerDown={locate}
                onPointerLeave={() => setActive(null)}
            >
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={area} fill={`url(#${gradientId})`} />
                    <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                {ap && (
                    <>
                        <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-gray-300" style={{ left: `${ap.x}%` }} />
                        <div
                            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                            style={{ left: `${ap.x}%`, top: `${(ap.y / 40) * 100}%`, backgroundColor: color }}
                        />
                        <ChartTooltip left={ap.x} top={(ap.y / 40) * 100} label={data[active].label} value={data[active].value} />
                    </>
                )}
            </div>
            <AxisLabels data={data} active={active} />
        </div>
    );
}

/**
 * Donut with a centered total. Hover highlights a slice (and shows its share in
 * the centre); clicking a slice explodes it outward and keeps its info pinned.
 * segments: [{ label, value, color }]. Optional onSelect(segment|null).
 */
export function Donut({ segments = [], size = 168, thickness = 22, onSelect }) {
    const [hover, setHover] = useState(null);
    const [selected, setSelected] = useState(null);

    const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0);
    const cx = size / 2;
    const cy = size / 2;
    const r = (size - thickness) / 2 - 10; // leave room for the explode/hover bump
    const c = 2 * Math.PI * r;
    const pop = 7;

    let acc = 0;
    const arcs = segments.map((seg, i) => {
        const value = Number(seg.value) || 0;
        const frac = total > 0 ? value / total : 0;
        const startFrac = total > 0 ? acc / total : 0;
        acc += value;
        const theta = ((-90 + (startFrac + frac / 2) * 360) * Math.PI) / 180; // screen-space mid-angle
        return {
            ...seg,
            i,
            value,
            frac,
            len: frac * c,
            offset: startFrac * c,
            dx: Math.cos(theta) * pop,
            dy: Math.sin(theta) * pop,
        };
    });

    const activeIndex = selected ?? hover;
    const dimmed = activeIndex !== null;

    const pick = (i) => {
        const next = selected === i ? null : i;
        setSelected(next);
        onSelect?.(next === null ? null : segments[next]);
    };

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto select-none">
            <g transform={`rotate(-90 ${cx} ${cy})`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F1F4" strokeWidth={thickness} />
            </g>
            {total > 0 && arcs.map((a) => {
                const isActive = activeIndex === a.i;
                return (
                    <g key={a.i} transform={selected === a.i ? `translate(${a.dx.toFixed(2)} ${a.dy.toFixed(2)})` : undefined} style={{ transition: 'transform 0.2s ease' }}>
                        <g transform={`rotate(-90 ${cx} ${cy})`}>
                            <circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill="none"
                                stroke={a.color}
                                strokeWidth={isActive ? thickness + 3 : thickness}
                                strokeDasharray={`${a.len.toFixed(2)} ${(c - a.len).toFixed(2)}`}
                                strokeDashoffset={-a.offset}
                                style={{ cursor: 'pointer', transition: 'stroke-width 0.15s, opacity 0.15s', opacity: dimmed && !isActive ? 0.35 : 1 }}
                                onPointerEnter={() => setHover(a.i)}
                                onPointerLeave={() => setHover(null)}
                                onClick={() => pick(a.i)}
                            />
                        </g>
                    </g>
                );
            })}

            {activeIndex !== null && arcs[activeIndex] ? (
                <>
                    <text x="50%" y="43%" textAnchor="middle" dominantBaseline="central" className="fill-gray-800 font-bold" style={{ fontSize: size * 0.17 }}>
                        {arcs[activeIndex].value}
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="fill-gray-500" style={{ fontSize: size * 0.085 }}>
                        {arcs[activeIndex].label} · {Math.round(arcs[activeIndex].frac * 100)}%
                    </text>
                </>
            ) : (
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-gray-800 font-bold" style={{ fontSize: size * 0.2 }}>
                    {total}
                </text>
            )}
        </svg>
    );
}

/** Horizontal bars for ranked items, with a hover highlight. */
export function HBars({ items = [], color = '#E91E63' }) {
    const [hover, setHover] = useState(null);
    const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
    return (
        <div className="space-y-3">
            {items.map((it, i) => (
                <div
                    key={i}
                    title={it.label}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    className="cursor-default"
                >
                    <div className="mb-1 flex justify-between text-sm">
                        <span className={`truncate font-medium ${hover === i ? 'text-gray-900' : 'text-gray-700'}`}>{it.label}</span>
                        <span className="ms-2 shrink-0 text-gray-500">{it.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(Number(it.value) / max) * 100}%`, backgroundColor: color, opacity: hover === null || hover === i ? 1 : 0.5 }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
