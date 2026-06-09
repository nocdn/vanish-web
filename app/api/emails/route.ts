import * as chrono from "chrono-node";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { generateRandomEmail } from "@/lib/generate-random-email";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
const convex = new ConvexHttpClient(convexUrl);

const jsonHeaders = { "Content-Type": "application/json" };

export async function GET(_request: Request) {
	const emails = await convex.query(api.emails.getEmails);
	return new Response(JSON.stringify(emails), {
		status: 200,
		headers: jsonHeaders,
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
	const createdEmail = emails.find((e: { email: string }) =>
		e.email.startsWith(emailPrefix),
	);

	return new Response(
		JSON.stringify({
			email: createdEmail?.email ?? emailPrefix,
			expiry: expiryTimestamp,
			cloudflare: result,
		}),
		{
			status: 201,
			headers: jsonHeaders,
		},
	);
}

export async function PATCH(request: Request) {
	const requestId = crypto.randomUUID();
	console.info("[api/emails PATCH] Received request", {
		requestId,
		method: request.method,
		url: request.url,
	});

	let body: unknown;

	try {
		body = await request.json();
		console.info("[api/emails PATCH] Parsed body", {
			requestId,
			body: getUpdateBodyLogPayload(body),
		});
	} catch (error) {
		console.error("[api/emails PATCH] Invalid JSON body", {
			requestId,
			error: getErrorMessage(error),
		});
		return jsonResponse({ error: "Invalid JSON body" }, 400);
	}

	const email =
		typeof body === "object" &&
		body !== null &&
		"email" in body &&
		typeof body.email === "string"
			? body.email.trim()
			: "";

	if (!email) {
		console.warn("[api/emails PATCH] Missing email", { requestId });
		return jsonResponse(
			{ error: 'Request body must include an "email" string' },
			400,
		);
	}

	const commentResult = readOptionalComment(body);
	if (!commentResult.ok) {
		console.warn("[api/emails PATCH] Invalid comment", { requestId, email });
		return jsonResponse(
			{ error: 'Request body "comment" must be a string or null' },
			400,
		);
	}

	const expiryResult = readOptionalExpiry(body);
	if (!expiryResult.ok) {
		console.warn("[api/emails PATCH] Invalid expiry", { requestId, email });
		return jsonResponse(
			{ error: 'Request body "expiry" must be a number or null' },
			400,
		);
	}

	console.info("[api/emails PATCH] Looking up email", { requestId, email });
	const existing = await convex.query(api.emails.getEmailByEmail, { email });
	if (!existing) {
		console.warn("[api/emails PATCH] Email not found", { requestId, email });
		return jsonResponse({ error: "Email not found" }, 404);
	}

	console.info("[api/emails PATCH] Updating email", {
		requestId,
		email,
		id: existing._id,
		payload: {
			comment:
				commentResult.value === undefined
					? null
					: `[${commentResult.value.length} chars]`,
			expiry:
				expiryResult.value === undefined
					? null
					: new Date(expiryResult.value).toISOString(),
		},
	});

	await convex.action(api.emails.updateEmail, {
		id: existing._id,
		comment: commentResult.value,
		expiry: expiryResult.value,
	});

	const updatedEmail = await convex.query(api.emails.getEmailById, {
		id: existing._id,
	});

	console.info("[api/emails PATCH] Updated email", {
		requestId,
		email,
		id: existing._id,
		foundAfterUpdate: Boolean(updatedEmail),
	});

	return jsonResponse(updatedEmail, 200);
}

export async function DELETE(request: Request) {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
			status: 400,
			headers: jsonHeaders,
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
		return new Response(
			JSON.stringify({ error: 'Request body must include an "email" string' }),
			{
				status: 400,
				headers: jsonHeaders,
			},
		);
	}

	const existing = await convex.query(api.emails.getEmailByEmail, { email });
	if (!existing) {
		return new Response(JSON.stringify({ error: "Email not found" }), {
			status: 404,
			headers: jsonHeaders,
		});
	}

	await convex.action(api.emails.deleteEmail, { id: existing._id });

	return new Response(
		JSON.stringify({ deleted: true, email, id: existing._id }),
		{
			status: 200,
			headers: jsonHeaders,
		},
	);
}

function jsonResponse(data: unknown, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: jsonHeaders,
	});
}

function readOptionalComment(
	body: unknown,
): { ok: true; value: string | undefined } | { ok: false } {
	if (typeof body !== "object" || body === null || !("comment" in body)) {
		return { ok: true, value: undefined };
	}

	if (body.comment === null) {
		return { ok: true, value: undefined };
	}

	if (typeof body.comment !== "string") {
		return { ok: false };
	}

	const comment = body.comment.trim();
	return { ok: true, value: comment || undefined };
}

function readOptionalExpiry(
	body: unknown,
): { ok: true; value: number | undefined } | { ok: false } {
	if (typeof body !== "object" || body === null || !("expiry" in body)) {
		return { ok: true, value: undefined };
	}

	if (body.expiry === null) {
		return { ok: true, value: undefined };
	}

	if (typeof body.expiry !== "number" || !Number.isFinite(body.expiry)) {
		return { ok: false };
	}

	return { ok: true, value: body.expiry };
}

function getUpdateBodyLogPayload(body: unknown) {
	if (typeof body !== "object" || body === null) {
		return body;
	}

	return Object.fromEntries(
		Object.entries(body).map(([key, value]) => {
			if (key === "comment" && typeof value === "string") {
				return [key, `[${value.length} chars]`];
			}

			if (key === "expiry" && typeof value === "number") {
				return [key, new Date(value).toISOString()];
			}

			return [key, value];
		}),
	);
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Unknown error";
}
