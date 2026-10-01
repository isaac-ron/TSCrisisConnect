import express from "express";
import { prisma } from "../db.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { classifyCrisisBinary, classifySeverity } from "../nlp/ml-client.js";
import { logger } from "../logger.js";

const log = logger.child({ module: "messages" });

const router = express.Router();

// Create a new message with NLP analysis
router.post("/", authenticate, async (req, res) => {
  try {
    const { content, type = "general" } = req.body;
    const senderId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    let isCrisis = false;
    let severity = null;
    let crisisType = null;
    let confidence = null;

    // Analyze message with ML service if it's potentially a crisis alert
    if (type === "alert" || content.length > 20) {
      try {
        const binary = await classifyCrisisBinary(content);
        isCrisis = binary.isCrisis;
        confidence = binary.confidence;

        if (isCrisis) {
          ({ severity } = await classifySeverity(content));
        }
      } catch (mlError) {
        log.error({ err: mlError }, 'ML service error');
        // Continue without NLP insights if service fails
      }
    }

    // Create message with NLP insights
    const message = await prisma.message.create({
      data: {
        content,
        type,
        senderId,
        isCrisis,
        severity,
        crisisType,
        confidence,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        assignedResponder: true,
      }
    });

    res.status(201).json(message);
  } catch (error) {
    log.error({ err: error }, 'Error creating message');
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all messages with NLP insights
router.get("/", authenticate, authorize("first-responder", "admin"), async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        assignedResponder: {
          select: {
            id: true,
            name: true,
            department: true,
            phoneNumber: true,
          }
        },
      },
      orderBy: {
        timestamp: 'desc',
      }
    });

    res.json(messages);
  } catch (error) {
    log.error({ err: error }, 'Error fetching messages');
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get crisis messages only
router.get("/crisis", authenticate, authorize("first-responder", "admin"), async (req, res) => {
  try {
    const crisisMessages = await prisma.message.findMany({
      where: {
        isCrisis: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        assignedResponder: {
          select: {
            id: true,
            name: true,
            department: true,
            phoneNumber: true,
          }
        },
      },
      orderBy: {
        timestamp: 'desc',
      }
    });

    res.json(crisisMessages);
  } catch (error) {
    log.error({ err: error }, 'Error fetching crisis messages');
    res.status(500).json({ error: "Internal server error" });
  }
});

// Assign a first responder to a message
router.patch("/:id/assign", authenticate, authorize("first-responder", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { responderId } = req.body;

    const message = await prisma.message.update({
      where: { id: parseInt(id) },
      data: {
        assignedResponderId: responderId ? parseInt(responderId) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        assignedResponder: true,
      }
    });

    res.json(message);
  } catch (error) {
    log.error({ err: error }, 'Error assigning responder');
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
