import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("frontend login contract source checks", () => {
  it("main login submits appointmentId and password without username or platoonId", () => {
    const source = readSource("src/components/auth/LoginPageClient.tsx");

    expect(source).toContain("appointmentId: selectedAppointment.id");
    expect(source).toContain("password: data.password");
    expect(source).not.toContain("username: selectedAppointment.username");
    expect(source).not.toContain("platoonId:");
  });

  it("switch account login submits only identity id and password", () => {
    const source = readSource("src/components/auth/SwitchUserModal.tsx");

    expect(source).toContain("delegationId: selectedAppointment.delegationId ?? selectedAppointment.id");
    expect(source).toContain("appointmentId: selectedAppointment.appointmentId ?? selectedAppointment.id");
    expect(source).toContain("password: formData.password");
    expect(source).not.toContain("username: loginUsername,\n      password: formData.password");
    expect(source).not.toContain("...(platoonId ? { platoonId } : {})");
  });

  it("setup auto-login submits appointmentId and password only", () => {
    const source = readSource("src/components/setup/SetupPageClient.tsx");
    const loginCall = source.match(/await loginUser\(\{\s*([\s\S]*?)\s*\}\);/)?.[1] ?? "";

    expect(loginCall).toContain("appointmentId: result.appointmentId");
    expect(loginCall).toContain("password: bootstrapForm.password");
    expect(loginCall).not.toContain("username:");
    expect(loginCall).not.toContain("platoonId:");
  });
});
