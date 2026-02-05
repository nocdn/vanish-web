import * as chrono from "chrono-node";
import { ConvexHttpClient } from "convex/browser";
import { joyful } from "joyful";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
const convex = new ConvexHttpClient(convexUrl);

function generateRandomEmail(): string {
	return joyful();
}

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
