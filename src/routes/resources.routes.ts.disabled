import express from 'express';
import { resourcesController } from '../controllers/resources.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Resource:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *           example: "Room 1"
 *         description:
 *           type: string
 *           example: "Private treatment room with massage table"
 *         type:
 *           type: string
 *           enum: [ROOM, CHAIR, EQUIPMENT, STATION, VEHICLE, OTHER]
 *           example: "ROOM"
 *         capacity:
 *           type: number
 *           example: 2
 *         branchId:
 *           type: string
 *         isActive:
 *           type: boolean
 *           example: true
 *         settings:
 *           type: object
 *           properties:
 *             requiresBooking:
 *               type: boolean
 *             advanceBookingDays:
 *               type: number
 *             bufferTime:
 *               type: number
 *             maintenanceSchedule:
 *               type: object
 *               properties:
 *                 frequency:
 *                   type: string
 *                   enum: [daily, weekly, monthly]
 *                 duration:
 *                   type: number
 *                 time:
 *                   type: string
 *                   pattern: '^\\d{2}:\\d{2}$'
 *             pricing:
 *               type: object
 *               properties:
 *                 hourlyRate:
 *                   type: number
 *                 currency:
 *                   type: string
 *         availability:
 *           type: object
 *           properties:
 *             schedule:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   available:
 *                     type: boolean
 *                   timeSlots:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         startTime:
 *                           type: string
 *                         endTime:
 *                           type: string
 *             exceptions:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   available:
 *                     type: boolean
 *                   reason:
 *                     type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     CreateResourceRequest:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - capacity
 *         - branchId
 *         - settings
 *         - availability
 *       properties:
 *         name:
 *           type: string
 *           example: "Treatment Room A"
 *         description:
 *           type: string
 *           example: "Spacious room with natural lighting"
 *         type:
 *           type: string
 *           enum: [ROOM, CHAIR, EQUIPMENT, STATION, VEHICLE, OTHER]
 *         capacity:
 *           type: number
 *           minimum: 1
 *         branchId:
 *           type: string
 *         settings:
 *           type: object
 *           required:
 *             - requiresBooking
 *             - advanceBookingDays
 *             - bufferTime
 *           properties:
 *             requiresBooking:
 *               type: boolean
 *             advanceBookingDays:
 *               type: number
 *               minimum: 1
 *               maximum: 365
 *             bufferTime:
 *               type: number
 *               minimum: 0
 *               maximum: 120
 *         availability:
 *           type: object
 *           required:
 *             - schedule
 *             - exceptions
 *           properties:
 *             schedule:
 *               type: object
 *             exceptions:
 *               type: array
 * 
 *     ResourceAvailabilityCheck:
 *       type: object
 *       properties:
 *         available:
 *           type: boolean
 *         conflicts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [appointment, maintenance, blocked]
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               details:
 *                 type: object
 * 
 *     ResourceType:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           enum: [ROOM, CHAIR, EQUIPMENT, STATION, VEHICLE, OTHER]
 *         label:
 *           type: string
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/resources/types:
 *   get:
 *     summary: Get resource types
 *     description: Retrieve all available resource types with descriptions
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resource types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceType'
 *       500:
 *         description: Internal server error
 */
router.get('/types', authenticate, tenantIsolation, resourcesController.getResourceTypes.bind(resourcesController));

/**
 * @swagger
 * /api/v1/resources:
 *   get:
 *     summary: Get all resources
 *     description: Retrieve resources with optional filtering and pagination
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         description: Filter by branch ID
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         description: Filter by resource type
 *         schema:
 *           type: string
 *           enum: [ROOM, CHAIR, EQUIPMENT, STATION, VEHICLE, OTHER]
 *       - in: query
 *         name: isActive
 *         description: Filter by active status
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         description: Number of resources to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: offset
 *         description: Number of resources to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Resources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     resources:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Resource'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *       400:
 *         description: Bad request - Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, tenantIsolation, resourcesController.getResources.bind(resourcesController));

/**
 * @swagger
 * /api/v1/resources:
 *   post:
 *     summary: Create a new resource
 *     description: Create a new resource with settings and availability schedule
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateResourceRequest'
 *     responses:
 *       201:
 *         description: Resource created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Resource'
 *       400:
 *         description: Bad request - Validation error
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, tenantIsolation, resourcesController.createResource.bind(resourcesController));

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   get:
 *     summary: Get a single resource
 *     description: Retrieve detailed information about a specific resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Resource'
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, tenantIsolation, resourcesController.getResource.bind(resourcesController));

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   put:
 *     summary: Update a resource
 *     description: Update resource information, settings, or availability
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ROOM, CHAIR, EQUIPMENT, STATION, VEHICLE, OTHER]
 *               capacity:
 *                 type: number
 *               branchId:
 *                 type: string
 *               settings:
 *                 type: object
 *               availability:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Resource updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Resource'
 *       400:
 *         description: Bad request - Validation error
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, tenantIsolation, resourcesController.updateResource.bind(resourcesController));

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   delete:
 *     summary: Delete a resource
 *     description: Delete a resource (only allowed if no active bookings exist)
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     resourceId:
 *                       type: string
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Resource has active bookings
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, tenantIsolation, resourcesController.deleteResource.bind(resourcesController));

/**
 * @swagger
 * /api/v1/resources/{id}/check-availability:
 *   post:
 *     summary: Check resource availability
 *     description: Check if a resource is available for a specific time slot
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startTime
 *               - endTime
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T14:00:00.000Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T15:30:00.000Z"
 *               excludeAppointmentId:
 *                 type: string
 *                 description: Exclude this appointment from conflict check (for updates)
 *     responses:
 *       200:
 *         description: Availability checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ResourceAvailabilityCheck'
 *       400:
 *         description: Bad request - Invalid time range or validation error
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/check-availability', authenticate, tenantIsolation, resourcesController.checkAvailability.bind(resourcesController));

/**
 * @swagger
 * /api/v1/resources/{id}/availability:
 *   get:
 *     summary: Get resource availability
 *     description: Get resource availability for a date range with time slots
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         description: Start date (ISO format)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-15"
 *       - in: query
 *         name: endDate
 *         required: true
 *         description: End date (ISO format)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-21"
 *       - in: query
 *         name: slotDuration
 *         description: Duration of each time slot in minutes
 *         schema:
 *           type: integer
 *           minimum: 15
 *           maximum: 480
 *           default: 60
 *     responses:
 *       200:
 *         description: Availability retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     resourceId:
 *                       type: string
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                         endDate:
 *                           type: string
 *                         slotDuration:
 *                           type: number
 *                     availability:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           timeSlots:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 startTime:
 *                                   type: string
 *                                 endTime:
 *                                   type: string
 *                                 available:
 *                                   type: boolean
 *                                 bookingId:
 *                                   type: string
 *       400:
 *         description: Bad request - Invalid date range or parameters
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/availability', authenticate, tenantIsolation, resourcesController.getAvailability.bind(resourcesController));

/**
 * @swagger
 * /api/v1/resources/{id}/toggle-active:
 *   patch:
 *     summary: Toggle resource active status
 *     description: Activate or deactivate a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     resourceId:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     toggledAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/toggle-active', authenticate, tenantIsolation, resourcesController.toggleActive.bind(resourcesController));

export default router;