import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import { Role, AnnouncementCategory } from '@prisma/client';

import jwt from 'jsonwebtoken';
import { SocketService } from '../src/sockets/socket.service';

// Mock SocketService methods
vi.spyOn(SocketService, 'emitAnnouncementNew').mockImplementation(() => {});
vi.spyOn(SocketService, 'emitAnnouncementUpdated').mockImplementation(() => {});
vi.spyOn(SocketService, 'emitAnnouncementRemoved').mockImplementation(() => {});

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-do-not-use-in-prod';

function generateDriverToken(driverId = 'driver-123') {
  return jwt.sign({ id: driverId, userId: driverId, role: Role.DRIVER }, JWT_SECRET);
}

function generateCustomerToken(customerId = 'customer-123') {
  return jwt.sign({ id: customerId, userId: customerId, role: Role.CUSTOMER }, JWT_SECRET);
}

describe('Driver Profile & Announcements API', () => {
  const driverToken = generateDriverToken();
  const customerToken = generateCustomerToken();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Feature 2: Driver Profile Management
  // ───────────────────────────────────────────────────────────────────────────
  describe('GET /api/driver/profile & PATCH /api/driver/profile', () => {
    it('should retrieve driver profile as DRIVER', async () => {
      const mockSettings = {
        id: 1,
        driverName: 'Mustapha Zaxi',
        phoneNumber: '+213555123456',
        whatsappNumber: '+213555123456',
        profilePhoto: 'https://example.com/photo.jpg',
        description: 'Professional driver in BBA',
        workingHours: '08:00 - 20:00',
        minimumFare: 200,
        maxBookingDistanceKm: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.driverSettings.findUnique.mockResolvedValue(mockSettings as any);

      const res = await request(app)
        .get('/api/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      const profile = res.body.data?.profile || res.body;
      expect(profile.driverName).toBe('Mustapha Zaxi');
      expect(profile.phoneNumber).toBe('+213555123456');
    });

    it('should deny non-driver access to protected driver profile endpoint', async () => {
      const res = await request(app)
        .get('/api/driver/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('should update driver profile successfully', async () => {
      const updatePayload = {
        driverName: 'Mustapha BBA',
        workingHours: '07:00 - 22:00',
      };

      const updatedSettings = {
        id: 1,
        driverName: 'Mustapha BBA',
        phoneNumber: '+213555123456',
        whatsappNumber: null,
        profilePhoto: null,
        description: null,
        workingHours: '07:00 - 22:00',
        minimumFare: null,
        maxBookingDistanceKm: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.driverSettings.upsert.mockResolvedValue(updatedSettings as any);

      const res = await request(app)
        .patch('/api/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.driverName).toBe('Mustapha BBA');
      expect(res.body.workingHours).toBe('07:00 - 22:00');
    });

    it('should get public driver profile without authentication', async () => {
      const mockSettings = {
        id: 1,
        driverName: 'Mustapha Zaxi',
        phoneNumber: '+213555123456',
        whatsappNumber: '+213555123456',
        profilePhoto: 'https://example.com/photo.jpg',
        description: 'Professional driver in BBA',
        workingHours: '08:00 - 20:00',
        minimumFare: 200,
        maxBookingDistanceKm: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.driverSettings.findUnique.mockResolvedValue(mockSettings as any);

      const res = await request(app).get('/api/public/driver-profile');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'success',
        data: {
          driver: {
            driverName: 'Mustapha Zaxi',
            phoneNumber: '+213555123456',
            whatsappNumber: '+213555123456',
            profilePhoto: 'https://example.com/photo.jpg',
            description: 'Professional driver in BBA',
            workingHours: '08:00 - 20:00',
            isOnline: false,
            ratingAverage: 0,
            totalTrips: 0,
          },
        },
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Feature 3 & 4: Driver Announcements & Real-Time Socket.IO
  // ───────────────────────────────────────────────────────────────────────────
  describe('Driver Announcements System', () => {
    it('should create an announcement and emit announcement:new event', async () => {
      const payload = {
        title: 'Special Trip to Algiers',
        description: 'Leaving BBA for Algiers tomorrow at 8:00 AM',
        category: AnnouncementCategory.SPECIAL_OFFER,
        price: 2500,
        departureLocation: 'Bordj Bou Arréridj',
        destinationLocation: 'Algiers',
      };

      const mockCreated = {
        id: 'ann-1',
        driverId: 'driver-123',
        title: payload.title,
        description: payload.description,
        category: payload.category,
        price: payload.price,
        image: null,
        departureLocation: payload.departureLocation,
        destinationLocation: payload.destinationLocation,
        availableDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.announcement.create.mockResolvedValue(mockCreated as any);

      const res = await request(app)
        .post('/api/driver/announcements')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.title);
      expect(SocketService.emitAnnouncementNew).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ann-1', title: payload.title })
      );
    });

    it('should update an announcement and emit announcement:updated event', async () => {
      const existing = {
        id: 'ann-1',
        driverId: 'driver-123',
        title: 'Old Title',
        description: 'Old Desc',
        category: AnnouncementCategory.SPECIAL_OFFER,
        price: 2000,
        image: null,
        departureLocation: null,
        destinationLocation: null,
        availableDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updated = {
        ...existing,
        title: 'Updated Title',
        price: 2200,
      };

      prismaMock.announcement.findUnique.mockResolvedValue(existing as any);
      prismaMock.announcement.update.mockResolvedValue(updated as any);

      const res = await request(app)
        .patch('/api/driver/announcements/ann-1')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ title: 'Updated Title', price: 2200 });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(SocketService.emitAnnouncementUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ann-1', title: 'Updated Title' })
      );
    });

    it('should soft-delete an announcement (isActive=false) and emit announcement:removed event', async () => {
      const existing = {
        id: 'ann-1',
        driverId: 'driver-123',
        title: 'Title',
        isActive: true,
      };

      const softDeleted = {
        ...existing,
        isActive: false,
      };

      prismaMock.announcement.findUnique.mockResolvedValue(existing as any);
      prismaMock.announcement.update.mockResolvedValue(softDeleted as any);

      const res = await request(app)
        .delete('/api/driver/announcements/ann-1')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Announcement removed successfully');
      expect(SocketService.emitAnnouncementRemoved).toHaveBeenCalledWith('ann-1');
    });

    it('should fetch public active announcements with pagination and category filter', async () => {
      const announcements = [
        {
          id: 'ann-1',
          title: 'Special Trip to Sétif',
          description: 'Leaving at 10 AM',
          category: AnnouncementCategory.SPECIAL_OFFER,
          price: 1500,
          image: null,
          departureLocation: 'BBA',
          destinationLocation: 'Sétif',
          availableDate: null,
          createdAt: new Date(),
        },
      ];

      prismaMock.announcement.findMany.mockResolvedValue(announcements as any);
      prismaMock.announcement.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/public/announcements?category=SPECIAL_OFFER&page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.announcements).toHaveLength(1);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });
});
