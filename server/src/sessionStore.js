import session from 'express-session';
import { prisma } from './db.js';

export class PrismaSessionStore extends session.Store {
  constructor() {
    super();

  }

  async get(sid, callback) {
    try {
      const record = await prisma.session.findUnique({
        where: { sid },
      });
      if (!record) return callback(null, null);

      if (record.expiresAt && record.expiresAt < new Date()) {
        await prisma.session.delete({ where: { sid } }).catch(() => {});
        return callback(null, null);
      }

      const data = JSON.parse(record.data);
      callback(null, data);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sess, callback) {
    try {
      let expiresAt;
      if (sess && sess.cookie && sess.cookie.expires) {
        expiresAt = new Date(sess.cookie.expires);
      } else {
        const maxAge = (sess && sess.cookie && sess.cookie.maxAge) || 24 * 60 * 60 * 1000;
        expiresAt = new Date(Date.now() + maxAge);
      }

      const data = JSON.stringify(sess);
      await prisma.session.upsert({
        where: { sid },
        update: {
          data,
          expiresAt,
        },
        create: {
          id: sid,
          sid,
          data,
          expiresAt,
        },
      });
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await prisma.session.delete({
        where: { sid },
      }).catch(() => {});
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid, sess, callback) {
    try {
      let expiresAt;
      if (sess && sess.cookie && sess.cookie.expires) {
        expiresAt = new Date(sess.cookie.expires);
      } else {
        const maxAge = (sess && sess.cookie && sess.cookie.maxAge) || 24 * 60 * 60 * 1000;
        expiresAt = new Date(Date.now() + maxAge);
      }

      await prisma.session.update({
        where: { sid },
        data: { expiresAt },
      }).catch(() => {});
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}
