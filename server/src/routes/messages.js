import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
        // Binary classification - is it a crisis?
        const binaryResponse = await fetch(`${ML_SERVICE_URL}/classify/binary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content }),
        });

        if (binaryResponse.ok) {
          const binaryResult = await binaryResponse.json();
          isCrisis = binaryResult.label === "crisis" || binaryResult.label === "LABEL_1";
          confidence = binaryResult.score;

          // If it's a crisis, get severity
          if (isCrisis) {
            const severityResponse = await fetch(`${ML_SERVICE_URL}/classify/severity`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: content }),
            });

            if (severityResponse.ok) {
              const severityResult = await severityResponse.json();
              severity = severityResult.label;
              
              // Map severity labels to standard format
              const severityMap = {
                'LABEL_0': 'Low',
                'LABEL_1': 'Medium', 
                'LABEL_2': 'High',
                'LABEL_3': 'Critical'
              };
              severity = severityMap[severity] || severity;
            }
          }
        }
      } catch (mlError) {
        console.error('ML service error:', mlError);
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
    console.error('Error creating message:', error);
    res.status(500).json({ error: error.message });
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
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
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
    console.error('Error fetching crisis messages:', error);
    res.status(500).json({ error: error.message });
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
    console.error('Error assigning responder:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
