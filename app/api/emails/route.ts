import * as chrono from "chrono-node";
import { ConvexHttpClient } from "convex/browser";
import { generate } from "random-words";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
const convex = new ConvexHttpClient(convexUrl);

const DOMAIN = process.env.DOMAIN;

function generateRandomEmail(): string {
	const words = generate({ exactly: 2, maxLength: 8 }) as string[];
	const randomNum = Math.floor(Math.random() * 900) + 100;
	return `${words[0]}_${words[1]}${randomNum}`;
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
	const fullEmail = `${emailPrefix}@${DOMAIN}`;

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

	return new Response(
		JSON.stringify({
			email: fullEmail,
			expiry: expiryTimestamp,
			cloudflare: result,
		}),
		{
			status: 201,
			headers: { "Content-Type": "application/json" },
		},
	);
}
