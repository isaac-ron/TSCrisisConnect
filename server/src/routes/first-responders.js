import express from "express";
import { prisma } from "../db.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { logger } from "../logger.js";

const log = logger.child({ module: "first-responders" });

const router = express.Router();

// Get all first responders
router.get("/", async (req, res) => {
  try {
    const responders = await prisma.firstResponder.findMany({
      orderBy: {
        name: 'asc',
      }
    });

    res.json(responders);
  } catch (error) {
    log.error({ err: error }, 'Error fetching first responders');
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a specific first responder by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const responder = await prisma.firstResponder.findUnique({
      where: { id: parseInt(id) },
      include: {
        assignedMessages: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
        assignedReports: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        }
      }
    });

    if (!responder) {
      return res.status(404).json({ error: "First responder not found" });
    }

    res.json(responder);
  } catch (error) {
    log.error({ err: error }, 'Error fetching first responder');
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new first responder
router.post("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { name, badgeNumber, department, phoneNumber, email, status } = req.body;

    if (!name || !badgeNumber || !department || !phoneNumber) {
      return res.status(400).json({ 
        error: "Name, badge number, department, and phone number are required" 
      });
    }

    const responder = await prisma.firstResponder.create({
      data: {
        name,
        badgeNumber,
        department,
        phoneNumber,
        email,
        status: status || "available",
      }
    });

    res.status(201).json(responder);
  } catch (error) {
    log.error({ err: error }, 'Error creating first responder');
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: "A first responder with this badge number or email already exists" 
      });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a first responder
router.put("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, badgeNumber, department, phoneNumber, email, status } = req.body;

    const responder = await prisma.firstResponder.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(badgeNumber && { badgeNumber }),
        ...(department && { department }),
        ...(phoneNumber && { phoneNumber }),
        ...(email && { email }),
        ...(status && { status }),
      }
    });

    res.json(responder);
  } catch (error) {
    log.error({ err: error }, 'Error updating first responder');
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "First responder not found" });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get first responder for a specific report
router.get("/report/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        assignedResponder: true,
      }
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json(report.assignedResponder);
  } catch (error) {
    log.error({ err: error }, 'Error fetching responder for report');
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
