import { redirect } from "next/navigation";

export default function LegacyPlayRedirect() {
  redirect("/games/kana");
}
