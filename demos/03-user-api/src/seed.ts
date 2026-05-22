import { userService } from './services/userService.js'

export async function seedIfEmpty(): Promise<void> {
  const { items } = await userService.findAll({ page: 1, limit: 1 })
  if (items.length > 0) return

  await userService.create({
    email: 'admin@example.com',
    password: 'Admin1234',
    name: 'Admin',
    role: 'admin'
  })
  await userService.create({
    email: 'alice@example.com',
    password: 'Alice1234',
    name: 'Alice'
  })
  console.log('[seed] 默认账户已创建：')
  console.log('  admin@example.com / Admin1234')
  console.log('  alice@example.com / Alice1234')
}
