import { redirect } from "next/navigation";

export default function LegacyRelegationRedirectPage() {
  redirect("/dashboard/genmgmt/promotion-relegation");
}
