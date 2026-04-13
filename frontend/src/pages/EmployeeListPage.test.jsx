import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderApp } from "../test/test-utils";

function mockJsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockDashboardResponse() {
  return mockJsonResponse({ employee_stats: [] });
}

describe("Employee roster", () => {
  beforeEach(() => {
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders employees and supports creating a new employee", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ manager: { id: 1, username: "manager" } }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          employees: [{ id: 1, employee_code: "EMP-001", full_name: "Ada", department: "Engineering", position: "Engineer", is_active: true }],
        }),
      )
      .mockResolvedValueOnce(mockDashboardResponse())
      .mockResolvedValueOnce(mockJsonResponse({ employee: { id: 2, employee_code: "EMP-002", full_name: "Grace", department: "HR", position: "Specialist", is_active: true } }, 201))
      .mockResolvedValueOnce(
        mockJsonResponse({
          employees: [
            { id: 1, employee_code: "EMP-001", full_name: "Ada", department: "Engineering", position: "Engineer", is_active: true },
            { id: 2, employee_code: "EMP-002", full_name: "Grace", department: "HR", position: "Specialist", is_active: true },
          ],
        }),
      )
      .mockResolvedValueOnce(mockDashboardResponse());
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/manager/employees");

    expect(await screen.findByText("EMP-001")).toBeInTheDocument();

    await user.type(document.getElementById("employee-code"), "EMP-002");
    await user.type(document.getElementById("employee-name"), "Grace");
    await user.type(document.getElementById("employee-position"), "Specialist");
    await user.type(document.getElementById("employee-department"), "HR");
    await user.click(document.querySelector('.employee-create-panel form button[type="submit"]'));

    expect(await screen.findByText("EMP-002")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/manager/employees",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("supports inline employee edits including department and position", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ manager: { id: 1, username: "manager" } }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          employees: [{ id: 1, employee_code: "EMP-001", full_name: "Ada", department: "Engineering", position: "Engineer", is_active: true }],
        }),
      )
      .mockResolvedValueOnce(mockDashboardResponse())
      .mockResolvedValueOnce(
        mockJsonResponse({
          employee: { id: 1, employee_code: "EMP-001A", full_name: "Ada Lovelace", department: "R&D", position: "Lead Engineer", is_active: true },
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          employees: [{ id: 1, employee_code: "EMP-001A", full_name: "Ada Lovelace", department: "R&D", position: "Lead Engineer", is_active: true }],
        }),
      )
      .mockResolvedValueOnce(mockDashboardResponse());
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/manager/employees");

    expect(await screen.findByText("EMP-001")).toBeInTheDocument();

    const row = screen.getByText("EMP-001").closest("tr");
    await user.click(within(row).getAllByRole("button")[0]);

    const inputs = row.querySelectorAll("input");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "Ada Lovelace");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "EMP-001A");
    await user.clear(inputs[2]);
    await user.type(inputs[2], "R&D");
    await user.clear(inputs[3]);
    await user.type(inputs[3], "Lead Engineer");

    await user.click(within(row).getAllByRole("button")[0]);

    expect(await screen.findByText("EMP-001A")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("soft deletes employees from the active list", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ manager: { id: 1, username: "manager" } }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          employees: [{ id: 1, employee_code: "EMP-001", full_name: "Ada", department: "Engineering", position: "Engineer", is_active: true }],
        }),
      )
      .mockResolvedValueOnce(mockDashboardResponse())
      .mockResolvedValueOnce(mockJsonResponse({ status: "deleted", employee_id: 1, deactivated: true, deleted_face_samples: 1 }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          employees: [{ id: 1, employee_code: "EMP-001", full_name: "Ada", department: "Engineering", position: "Engineer", is_active: false }],
        }),
      )
      .mockResolvedValueOnce(mockDashboardResponse());
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/manager/employees");

    expect(await screen.findByText("EMP-001")).toBeInTheDocument();
    const row = screen.getByText("EMP-001").closest("tr");
    await user.click(within(row).getAllByRole("button")[1]);

    expect(screen.queryByText("EMP-001")).not.toBeInTheDocument();
  });
});
