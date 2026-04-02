import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { renderApp } from "./test/test-utils";

describe("attendance route", () => {
  it("renders the manager attendance page under the protected route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ manager: { id: 1, username: "manager" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              filters: { from: "2026-04-03", to: "2026-04-03", search: "" },
              summary: { total_records: 0 },
              records: [],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
    );

    renderApp("/manager/attendance");

    expect(await screen.findByRole("heading", { name: "Nhật ký chấm công" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cham cong" })).toBeInTheDocument();
  });

  it("redirects unauthenticated attendance access to manager login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderApp("/manager/attendance");

    expect(await screen.findByRole("heading", { name: /sign in to manage employees/i })).toBeInTheDocument();
  });
});
