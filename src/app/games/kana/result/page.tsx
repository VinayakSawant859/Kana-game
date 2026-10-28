import { redirect } from "next/navigation";

export default function LegacyResultRedirect() {
  redirect("/games/kana");
}
