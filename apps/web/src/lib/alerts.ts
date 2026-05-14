import { prisma } from '@kidai/db'
import type { AlertType } from '@kidai/shared'

/**
 * Create an alert for a parent when a safety event occurs
 */
export async function createAlert(params: {
  parentId: string
  childId: string
  messageId?: string
  alertType: AlertType
  description: string
}): Promise<void> {
  await prisma.alert.create({
    data: {
      parentId: params.parentId,
      childId: params.childId,
      messageId: params.messageId,
      alertType: params.alertType,
      description: params.description,
    },
  })
}

/**
 * Get unread alert count for a parent
 */
export async function getUnreadAlertCount(parentId: string): Promise<number> {
  return prisma.alert.count({
    where: { parentId, read: false },
  })
}

/**
 * Mark alerts as read
 */
export async function markAlertsRead(parentId: string, alertIds: string[]): Promise<void> {
  await prisma.alert.updateMany({
    where: { id: { in: alertIds }, parentId },
    data: { read: true, readAt: new Date() },
  })
}
