const request = require('request')
const cheerio = require('cheerio')
const { request: config } = require('../../../config')
const { service } = require('../../../db')
const getUrlParam = require('../../../utils/get-url-param')
const sleep = require('../../../utils/sleep')

function getMembers (resolve, url, memberCount = 0) {
	request({
		url,
		method: 'GET',
		headers: config.headers()
	}, async (error, response, body) => {
		if (error) {
			return resolve([error])
		}

		if (response.statusCode === 200) {
			const $ = cheerio.load(body)
			const $members = $('.member-list').last().find('li')
			const $next = $('.paginator .next a')
			const members = []

			$members.each(function () {
				const $this = $(this)
				const $user = $this.find('.name a')

				const id = getUrlParam($user.attr('href'), 'people')
				const name = $user.text().trim()
				const avatar = $this.find('img').attr('src')

				members.push({
					id,
					name,
					avatar
				})
			})

			const [createError] = await service.User.bulkCreate(members, { ignoreDuplicates: true })

			if (createError) {
				return resolve([createError])
			}

			memberCount += members.length

			console.log(`${memberCount}: insert ${members.length} members`)

			if ($next.length > 0) {
				const next = $next.attr('href')

				await sleep(10000 + Math.random() * 20000)

				return getMembers(resolve, next, memberCount)
			}

			resolve([null, memberCount])
		} else {
			resolve([new Error(body)])
		}
	})
}

function getGroupMembers (url) {
	return new Promise(resolve => {
		getMembers(resolve, url)
	})
}

module.exports = getGroupMembers