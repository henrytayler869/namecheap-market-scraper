import { NextRequest, NextResponse } from "next/server";
import { upsertRows, upsertAssessments, AhrefsResultRow, AssessmentRow } from "@/lib/ahrefs-db";

// POST body: { rows: AhrefsResultRow[], assessments?: AssessmentRow[] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      rows?: Omit<AhrefsResultRow, "checkedAt">[];
      assessments?: Omit<AssessmentRow, "updatedAt">[];
    };

    const rows = body.rows ?? [];
    const assessments = body.assessments ?? [];

    if (rows.length === 0 && assessments.length === 0) {
      return NextResponse.json(
        { error: "rows hoặc assessments phải có ít nhất 1 mục" },
        { status: 400 }
      );
    }

    const refsResult = rows.length > 0
      ? await upsertRows(rows)
      : { added: 0, updated: 0, total: 0, uniqueTargets: 0 };

    const assessResult = assessments.length > 0
      ? await upsertAssessments(assessments)
      : { added: 0, total: 0 };

    return NextResponse.json({
      ok: true,
      refs: refsResult,
      assessments: assessResult,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
