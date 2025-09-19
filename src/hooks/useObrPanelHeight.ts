import { useCallback, useEffect, useRef } from "react";

import OBR from "@owlbear-rodeo/sdk";

const HEIGHT_EPSILON = 1; // px

/**
 * Mirrors the natural layout height of the panel into the Owlbear Rodeo iframe.
 */
export function useObrPanelHeight(debug = false) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const participantListRef = useRef<HTMLUListElement | null>(null);
  const lastRequestedHeight = useRef<number | null>(null);
  const lastViewportHeight = useRef<number>(0);
  const measurementFrame = useRef<number | null>(null);

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log("[Resize]", ...args);
      }
    },
    [debug]
  );

  const measureContentHeight = useCallback(() => {
    const containerEl = containerRef.current;
    if (!containerEl) {
      return null;
    }

    const participantEl = participantListRef.current;
    const participantClient = participantEl?.clientHeight ?? 0;
    const participantScroll = participantEl?.scrollHeight ?? participantClient;
    const participantOverflow = participantScroll - participantClient;
    const rawHeight =
      containerEl.scrollHeight - participantClient + participantScroll;
    const contentHeight = Math.ceil(rawHeight);

    log(
      `container scrollHeight=${containerEl.scrollHeight}, participant scrollHeight=${participantScroll}, participant clientHeight=${participantClient}, participant overflow=${participantOverflow}, measured content=${contentHeight}`
    );

    return contentHeight;
  }, [containerRef, participantListRef, log]);

  const scheduleContentMeasurement = useCallback(() => {
    const runMeasurement = () => {
      measurementFrame.current = null;

      const contentHeight = measureContentHeight();
      if (contentHeight == null) {
        return;
      }

      const previousHeight = lastRequestedHeight.current;
      if (
        previousHeight !== null &&
        Math.abs(contentHeight - previousHeight) <= HEIGHT_EPSILON
      ) {
        log(
          `Skip setHeight – delta ${Math.abs(
            contentHeight - previousHeight
          )} <= ${HEIGHT_EPSILON}`
        );
        return;
      }

      lastRequestedHeight.current = contentHeight;
      OBR.action
        .setHeight(contentHeight)
        .then(() => {
          log(`Requested OBR panel height ${contentHeight}`);
        })
        .catch((error) => {
          console.error("[Resize] Failed to set OBR panel height", error);
        });
    };

    if (measurementFrame.current !== null) {
      return;
    }

    if (typeof window !== "undefined") {
      if (typeof window.requestAnimationFrame === "function") {
        measurementFrame.current = window.requestAnimationFrame(runMeasurement);
        return;
      }

      measurementFrame.current = window.setTimeout(runMeasurement, 0);
      return;
    }

    runMeasurement();
  }, [measureContentHeight, log]);

  const applyViewportConstraint = useCallback(() => {
    const containerEl = containerRef.current;
    if (!containerEl) {
      return;
    }

    const viewportHeight = Math.round(window.innerHeight);
    if (Math.abs(viewportHeight - lastViewportHeight.current) > HEIGHT_EPSILON) {
      containerEl.style.maxHeight = `${viewportHeight}px`;
      lastViewportHeight.current = viewportHeight;
      log(`Applied viewport constraint ${viewportHeight}`);
    }

    scheduleContentMeasurement();
  }, [containerRef, log, scheduleContentMeasurement]);

  useEffect(() => {
    applyViewportConstraint();
    const handleResize = () => applyViewportConstraint();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [applyViewportConstraint]);

  useEffect(() => {
    const observerTarget = containerRef.current;
    if (!observerTarget || typeof ResizeObserver === "undefined") {
      scheduleContentMeasurement();
      return;
    }

    const observer = new ResizeObserver(() => {
      scheduleContentMeasurement();
    });

    observer.observe(observerTarget);
    scheduleContentMeasurement();

    return () => {
      observer.disconnect();
    };
  }, [containerRef, scheduleContentMeasurement]);

  useEffect(() => {
    return () => {
      if (measurementFrame.current === null) {
        return;
      }

      if (typeof window !== "undefined") {
        if (typeof window.cancelAnimationFrame === "function") {
          window.cancelAnimationFrame(measurementFrame.current);
        } else {
          window.clearTimeout(measurementFrame.current);
        }
      }

      measurementFrame.current = null;
    };
  }, []);
  return { containerRef, participantListRef };
}
