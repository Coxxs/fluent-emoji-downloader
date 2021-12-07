'use strict'

import fetch from "node-fetch"
import pLimit from "p-limit"
import { promises as fs } from 'fs'

const limit = pLimit(20)

function fetchStatic(url) {
  return fetch(url, {
    "headers": {
      "Referer": "https://teams.live.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
    }
  })
}

async function downloadAndSave(url, file) {
  for (let i = 0; i < 3; i++) {
    try {
      let response = await fetchStatic(url)
      let data = await response.buffer()
      await fs.writeFile(file, data)
      return
    } catch (err) {
      if (i >= 2) {
        throw err
      }
    }
  }
}

async function checkExists(file) {
  try {
    await fs.access(file)
    return true
  } catch (err) {
    return false
  }
}

const endpoint = 'https://statics.teams.cdn.live.net/evergreen-assets/personal-expressions/'
const metadata = 'v1/metadata/8479a21d47934aed85d6d6f236847484/en-us.json'
const version = 'v2'
const animated = false

const outputDir = 'output_' + version + (animated ? '_animated' : '')

if (!await checkExists('emoji.json')){
  let response = await fetchStatic(endpoint + metadata)
  let data = await response.json()
  await fs.writeFile('emoji.json', JSON.stringify(data, null, '\t'))
}

let emojiList = JSON.parse(await fs.readFile('emoji.json'))

if (!await checkExists(outputDir)) {
  await fs.mkdir(outputDir)
}

for (const category of emojiList.categories) {
  let categoryDir = outputDir + '/' + category.title
  if (!await checkExists(categoryDir)) {
    await fs.mkdir(categoryDir)
  }
  for (const emoji of category.emoticons) {
    const anim = (animated ? '_anim' : '')
    limit(() => downloadAndSave(`${endpoint}${version}/assets/emoticons/${emoji.id}/default/100${anim}_f.png?${emoji.etag}`, `${categoryDir}/${emoji.id}.png`))
    if (emoji.diverse) {
      for (let i = 2; i <= 6; i++) {
        limit(() => downloadAndSave(`${endpoint}${version}/assets/emoticons/${emoji.id}/default/100${anim}_f_s${i}.png?${emoji.etag}`, `${categoryDir}/${emoji.id}_s${i}.png`))
      }
    }
  }
}