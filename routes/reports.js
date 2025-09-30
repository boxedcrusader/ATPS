import express from "express";
import requireAuth from "../middleware/auth.js";
const router = express.Router();

// Create a report
router.post("/report", requireAuth,async (req, res) => {
  try {
    const { reportType, description, tripId } = req.body;
    const driverId = req.user.id;

    if (!tripId || !reportType || !description) {
      return res.status(400).json({ error: "tripId, reportType, and description are required" });
    }

    const { data, error } = await req.supabase
      .from("reports")
      .insert([
        {
          trip_id: tripId,
          driver_id: driverId,
          report_type: reportType,
          description: description,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Report submitted successfully",
      report: data[0],
    });
  } catch (error) {
    console.error("Report error:", error);
    res.status(500).json({ error: "Server error during report" });
  }
});

export default router;
