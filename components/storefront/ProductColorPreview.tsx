"use client";
import Image from "next/image";
import { useId } from "react";
import { planterColors } from "@/lib/storefront";

/** Code-native color preview. Original WebP stays unchanged; never a generated photo. */
export function ProductColorPreview({
  src,
  name,
  color,
  zoom = false,
}: {
  src: string;
  name: string;
  color: string;
  zoom?: boolean;
}) {
  const id = `planter-color-${useId().replace(/:/g, "")}`;
  const sample = planterColors.find((c) => c.name === color);
  const tinted = sample && sample.id !== "negro";
  const channels = sample
    ? [1, 3, 5].map((i) => parseInt(sample.hex.slice(i, i + 2), 16) / 255)
    : [0, 0, 0];
  const slope = (channel: number) => (1 - channel) / 0.86;
  return (
    <>
      {tinted && (
        <svg
          width="0"
          height="0"
          aria-hidden="true"
          style={{ position: "absolute" }}
        >
          <defs>
            <filter id={id} colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR
                  type="linear"
                  slope={slope(channels[0])}
                  intercept={1 - slope(channels[0])}
                />
                <feFuncG
                  type="linear"
                  slope={slope(channels[1])}
                  intercept={1 - slope(channels[1])}
                />
                <feFuncB
                  type="linear"
                  slope={slope(channels[2])}
                  intercept={1 - slope(channels[2])}
                />
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>
      )}
      <Image
        src={src}
        alt={`${name}, ${tinted ? "vista digital de color" : "fotografía original"} ${color}`}
        fill
        sizes="(max-width:760px) 88vw, 44vw"
        style={{
          objectFit: "contain",
          filter: tinted ? `url(#${id})` : undefined,
          transform: zoom ? "scale(1.65)" : undefined,
        }}
      />
    </>
  );
}
