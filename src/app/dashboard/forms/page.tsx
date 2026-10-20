import HrFormsClient from "@/app/component/form/hr-form/HrFormsClient";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { redirect } from "next/navigation";

export default async function Forms(props: {
  searchParams: Promise<{ id?: string; name?: string }>;
}) {
  // ✅ Await searchParams first
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/"); //protected page
  }

  const searchParams = await props.searchParams;

  const forms = await prisma.formType.findMany({
    include: { flowSteps: true },
  });

  const id = searchParams.id ? Number(searchParams.id) : null;
  const name = searchParams.name ?? null;

  return <HrFormsClient forms={forms} selectedId={id} selectedName={name} />;
}

