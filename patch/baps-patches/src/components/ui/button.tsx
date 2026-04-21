"use client"

/**
 * Button · P1-2 위계 재정리
 * ─────────────────────────
 * 리뷰 결론: 기존 variant 8종(default/outline/secondary/ghost/destructive/link …)은
 * "의미" 가 아니라 "모양" 으로 나뉘어 있어, 화면마다 primary 가 2-3개씩 공존.
 *
 * 이번 패치:
 *   1. variant 를 tone 으로 **의미화** — primary / outline / ghost / alert / link
 *      (secondary 삭제, destructive → alert 로 네이밍)
 *   2. tone 별 시각 강도 곡선을 globals.p1.patch.css 의 `--btn-*` 토큰으로 추출.
 *      → 브랜딩 조정이 컴포넌트 코드 수정 없이 토큰만으로 가능.
 *   3. 사이즈 토큰(`h-` / `px-`)을 디자인 시스템 스케일(8/24/32/40)로 재정렬.
 *   4. icon-only 버튼의 `aria-label` 강제 (타입으로는 못 막으므로 런타임 경고).
 *
 * 적용 후 호출부 마이그레이션:
 *   <Button variant="default">           → <Button tone="primary">
 *   <Button variant="secondary">         → <Button tone="outline">
 *   <Button variant="destructive">       → <Button tone="alert">
 *   <Button variant="outline" />         → <Button tone="outline" />  (그대로)
 *   <Button variant="ghost" />           → <Button tone="ghost" />    (그대로)
 *   <Button variant="link" />            → <Button tone="link" />     (그대로)
 */

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center",
    "whitespace-nowrap text-sm font-semibold",
    "border border-transparent bg-clip-padding",
    "transition-all outline-none select-none",
    "focus-visible:ring-[3px] focus-visible:ring-ring/55 focus-visible:border-ring",
    "active:not-aria-[haspopup]:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45",
    "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      tone: {
        /** 화면당 최대 1개. 가장 중요한 CTA. */
        primary: [
          "rounded-row",
          "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]",
          "hover:bg-[var(--btn-primary-hover)]",
          "shadow-sm",
        ].join(" "),

        /** 2차 액션. 확정/취소 쌍에서 확정이 아닌 쪽. */
        outline: [
          "rounded-row",
          "border-[color:var(--btn-outline-border)]",
          "bg-[var(--btn-outline-bg)] text-[var(--btn-outline-fg)]",
          "hover:bg-[var(--btn-outline-hover-bg)]",
          "aria-expanded:bg-[var(--btn-outline-hover-bg)]",
        ].join(" "),

        /** 3차 액션. 아이콘, 툴바, list row trailing. */
        ghost: [
          "rounded-row",
          "bg-[var(--btn-ghost-bg)] text-[var(--btn-ghost-fg)]",
          "hover:bg-[var(--btn-ghost-hover-bg)] hover:text-foreground",
          "aria-expanded:bg-[var(--btn-ghost-hover-bg)] aria-expanded:text-foreground",
        ].join(" "),

        /** 파괴적 액션 전용 (delete, reset, sign out). */
        alert: [
          "rounded-row",
          "bg-[var(--btn-alert-bg)] text-[var(--btn-alert-fg)]",
          "hover:bg-[var(--btn-alert-hover-bg)]",
          "focus-visible:ring-destructive/25 focus-visible:border-destructive/50",
        ].join(" "),

        /** 인라인 링크. 본문 안에서만 사용, 단독 CTA 로는 금지. */
        link: [
          "rounded-[4px] px-0 h-auto",
          "text-primary underline-offset-4 hover:underline",
        ].join(" "),
      },

      /** h · px · gap 3종을 세트로 이동. 시스템 스케일(24·28·32·40). */
      size: {
        xs:  "h-6 gap-1 rounded-chip px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm:  "h-7 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        md:  "h-8 gap-1.5 px-3",
        lg:  "h-10 gap-2 px-4 text-[0.95rem]",
        icon:     "size-8 rounded-row",
        "icon-xs":"size-6 rounded-chip [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":"size-7 rounded-row [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg":"size-10 rounded-row",
      },
    },
    defaultVariants: {
      tone: "primary",
      size: "md",
    },
  }
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>

export type ButtonProps = ButtonPrimitive.Props &
  ButtonVariantProps & {
    /** icon-only 사이즈는 반드시 aria-label 필요. */
    "aria-label"?: string
  }

function Button({
  className,
  tone = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  /* dev-only: icon 사이즈인데 라벨 누락 시 경고. */
  if (
    process.env.NODE_ENV !== "production" &&
    typeof size === "string" &&
    size.startsWith("icon") &&
    !("aria-label" in props) &&
    !("aria-labelledby" in props)
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "[ui/Button] icon-only button is missing aria-label. size=",
      size
    )
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      data-tone={tone}
      className={cn(buttonVariants({ tone, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
