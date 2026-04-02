import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { listAttendance } from "../lib/attendanceApi";
import { renderApp } from "../test/test-utils";

vi.mock("../lib/attendanceApi", () => ({
  listAttendance: vi.fn(),
}));

function stubManagerSession(...responses) {
  const fetchMock = vi.fn();
  responses.forEach((response) => {
    fetchMock.mockResolvedValueOnce(response);
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("AttendancePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads today attendance on mount and renders rows", async () => {
    stubManagerSession(
      new Response(JSON.stringify({ manager: { id: 1, username: "manager" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    listAttendance.mockResolvedValueOnce({
      filters: { from: "2026-04-03", to: "2026-04-03", search: "" },
      summary: { total_records: 1 },
      records: [
        {
          id: 1,
          employee_id: 5,
          employee_code: "EMP-001",
          full_name: "Nguyen Van A",
          checked_in_at: "2026-04-03T08:15:00+07:00",
          snapshot_url: "/api/manager/attendance/1/snapshot",
        },
      ],
    });

    renderApp("/manager/attendance");

    await waitFor(() => {
      expect(listAttendance).toHaveBeenCalled();
    });

    const [firstCall] = listAttendance.mock.calls[0];
    expect(firstCall).toEqual(
      expect.objectContaining({
        from: expect.any(String),
        to: expect.any(String),
        search: "",
      }),
    );
    expect(screen.getByLabelText("Tong so ban ghi")).toHaveTextContent("1");
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
    expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
    expect(screen.getByText(/08:15/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /anh check-in cua nguyen van a/i })).toHaveAttribute(
      "src",
      "/api/manager/attendance/1/snapshot",
    );
  });

  it("updates the request when filters are submitted", async () => {
    stubManagerSession(
      new Response(JSON.stringify({ manager: { id: 1, username: "manager" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    listAttendance
      .mockResolvedValueOnce({
        filters: { from: "2026-04-03", to: "2026-04-03", search: "" },
        summary: { total_records: 0 },
        records: [],
      })
      .mockResolvedValueOnce({
        filters: { from: "2026-04-01", to: "2026-04-03", search: "EMP" },
        summary: { total_records: 1 },
        records: [
          {
            id: 2,
            employee_id: 6,
            employee_code: "EMP-002",
            full_name: "Tran Thi B",
            checked_in_at: "2026-04-03T09:00:00+07:00",
            snapshot_url: "/api/manager/attendance/2/snapshot",
          },
        ],
      });

    renderApp("/manager/attendance");

    await waitFor(() => expect(listAttendance).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Tu ngay"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("Den ngay"), { target: { value: "2026-04-03" } });
    fireEvent.change(screen.getByLabelText("Tim nhan vien"), { target: { value: "EMP" } });
    fireEvent.click(screen.getByRole("button", { name: "Ap dung" }));

    await waitFor(() => expect(listAttendance).toHaveBeenCalledTimes(2));
    expect(listAttendance).toHaveBeenLastCalledWith({
      from: "2026-04-01",
      to: "2026-04-03",
      search: "EMP",
    });
    expect(screen.getByText("EMP-002")).toBeInTheDocument();
  });

  it("renders empty state when there are no records", async () => {
    stubManagerSession(
      new Response(JSON.stringify({ manager: { id: 1, username: "manager" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    listAttendance.mockResolvedValueOnce({
      filters: { from: "2026-04-03", to: "2026-04-03", search: "" },
      summary: { total_records: 0 },
      records: [],
    });

    renderApp("/manager/attendance");

    expect(await screen.findByText("Khong co ban ghi")).toBeInTheDocument();
    expect(screen.getByText("Hay thu doi bo loc ngay hoac tim kiem khac.")).toBeInTheDocument();
  });

  it("renders backend invalid_request messages for invalid filters", async () => {
    stubManagerSession(
      new Response(JSON.stringify({ manager: { id: 1, username: "manager" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    listAttendance.mockRejectedValueOnce({
      status: 400,
      payload: { status: "invalid_request", message: "from must be less than or equal to to" },
    });

    renderApp("/manager/attendance");

    expect(await screen.findByRole("alert")).toHaveTextContent("from must be less than or equal to to");
  });

  it("redirects to login when attendance load returns unauthorized", async () => {
    stubManagerSession(
      new Response(JSON.stringify({ manager: { id: 1, username: "manager" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(JSON.stringify({ status: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    listAttendance.mockRejectedValueOnce({
      status: 401,
      payload: { status: "unauthorized", message: "Ban can dang nhap lai." },
    });

    renderApp("/manager/attendance");

    expect(await screen.findByRole("heading", { name: /sign in to manage employees/i })).toBeInTheDocument();
  });
});
