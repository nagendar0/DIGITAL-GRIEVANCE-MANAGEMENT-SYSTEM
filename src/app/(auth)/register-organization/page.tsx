import { redirect } from "next/navigation";

export default function RegisterOrganizationRedirectPage() {
  redirect("/login?role=org&mode=signup");
}
