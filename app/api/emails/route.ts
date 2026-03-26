import * as chrono from "chrono-node";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { generateRandomEmail } from "@/lib/generate-random-email";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
const convex = new ConvexHttpClient(convexUrl);

export async function GET(_request: Request) {
	const emails = await convex.query(api.emails.getEmails);
	return new Response(JSON.stringify(emails), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

export async function POST(request: Request) {
	const body = await request.json();
	const { expiry, comment } = body;

	const emailPrefix = generateRandomEmail();

	let expiryTimestamp: number | undefined;
	const trimmedExpiry = typeof expiry === "string" ? expiry.trim() : "";
	if (trimmedExpiry && trimmedExpiry !== "never") {
		expiryTimestamp = chrono.parseDate(trimmedExpiry)?.getTime();
	}

	const result = await convex.action(api.emails.createEmailRoute, {
		email: emailPrefix,
		comment,
		expiry: expiryTimestamp,
	});

	// Get the newly created email from the database to return the full email address
	const emails = await convex.query(api.emails.getEmails);
	const createdEmail = emails.find((e: { email: string }) => e.email.startsWith(emailPrefix));

	return new Response(
		JSON.stringify({
			email: createdEmail?.email ?? emailPrefix,
			expiry: expiryTimestamp,
			cloudflare: result,
		}),
		{
			status: 201,
			headers: { "Content-Type": "application/json" },
		},
	);
}

export async function DELETE(request: Request) {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const email =
		typeof body === "object" &&
		body !== null &&
		"email" in body &&
		typeof body.email === "string"
			? body.email.trim()
			: "";

	if (!email) {
		return new Response(JSON.stringify({ error: 'Request body must include an "email" string' }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const existing = await convex.query(api.emails.getEmailByEmail, { email });
	if (!existing) {
		return new Response(JSON.stringify({ error: "Email not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	await convex.action(api.emails.deleteEmail, { id: existing._id });

	return new Response(JSON.stringify({ deleted: true, email, id: existing._id }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
