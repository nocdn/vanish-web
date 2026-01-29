import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
const convex = new ConvexHttpClient(convexUrl);

export async function DELETE(
	_request: Request,
	{ params }: { params: { email: string } },
) {
	const email = decodeURIComponent(params.email);

	const existing = await convex.query(api.emails.getEmailByEmail, { email });
	if (!existing) {
		return new Response(JSON.stringify({ error: "Email not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	await convex.action(api.emails.deleteEmail, { id: existing._id });

	return new Response(JSON.stringify({ deleted: true, id: existing._id }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

