import { Telegraf } from 'telegraf'
import schedule from 'node-schedule'
import isToday from 'date-fns/isToday'
import format from 'date-fns/format'

import { APARTMENT_IDS, JOBS } from './db'
import { getOffers } from './api'
import { DEFAULT_CONFIG } from './config'

const bot = new Telegraf(process.env.BOT_TOKEN as string)

bot.command('start', async (ctx) => {
  const chatReferenceId = ctx.message.chat.id

  JOBS[chatReferenceId]?.cancel()

  APARTMENT_IDS[chatReferenceId] = []

  JOBS[chatReferenceId] = schedule.scheduleJob('*/2 * * * *', async () => {
    const now = format(new Date(), 'dd MMM yyyy, HH:mm')

    try {
      const responses = await Promise.all(DEFAULT_CONFIG.map(getOffers))

      const apartments = responses.map((response) => response.data).flat()

      if (APARTMENT_IDS[chatReferenceId].length === 0) {
        APARTMENT_IDS[chatReferenceId] = apartments.map((apartment) => apartment.id)

        return
      }

      const latestApartments = apartments.filter((apartment) => {
        return !APARTMENT_IDS[chatReferenceId].includes(apartment.id) && isToday(new Date(apartment.created_time))
      })

      for (const latestApartment of latestApartments) {
        const link = latestApartment.url
        const desc = latestApartment.description
        const district = latestApartment.location?.district?.name
        const isFromAugust = desc.includes('1.08') || desc.includes('od sierpnia') || desc.includes('od 1 sierpnia')

        const rent = latestApartment.params?.find((param) => param.key === 'rent')?.value?.key || 0
        const price = latestApartment.params?.find((param) => param.key === 'price')?.value?.value || 0
        const m = latestApartment.params?.find((param) => param.key === 'm')?.value?.key

        const message = `📍${district}, ${price}/${rent} PLN, ${m}м²${isFromAugust ? ' (from 01.08)' : ''}`

        const totalPrice = price + Number(rent)

        if (desc.includes('okazjonaln')) {
          console.log(`${now}: apartment skipped because of the occasional rent`)

          continue
        }

        if (totalPrice > 3600) {
          console.log(`${now}: apartment skipped because of the price ${totalPrice}`)

          continue
        }

        await ctx.telegram.sendMessage(chatReferenceId, `${message}\n\n${link}`)
      }

      APARTMENT_IDS[chatReferenceId] = [...APARTMENT_IDS[chatReferenceId], ...latestApartments.map((a) => a.id)]
    } catch (error) {
      console.log('Error: ', error)

      await ctx.telegram.sendMessage(chatReferenceId, 'Something wrong..')

      return
    }
  })

  await ctx.telegram.sendMessage(chatReferenceId, `Bot started working..`)
})

bot.command('stop', async (ctx) => {
  JOBS[ctx.message.chat.id]?.cancel()
  APARTMENT_IDS[ctx.message.chat.id] = []
})

bot.command('quit', async (ctx) => {
  JOBS[ctx.message.chat.id]?.cancel()

  await ctx.telegram.leaveChat(ctx.message.chat.id)

  await ctx.leaveChat()
})

bot.launch()

process.once('SIGINT', () => {
  bot.stop('SIGINT')
  schedule.gracefulShutdown().then(() => process.exit(0))
})

process.once('SIGTERM', () => {
  bot.stop('SIGTERM')
  schedule.gracefulShutdown().then(() => process.exit(0))
})
