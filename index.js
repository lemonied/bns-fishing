/*
  --By ChenJiYuan
  get-pixels  解析图片的rgb通道值
  robotjs  系统键盘事件派发
  screenshot-desktop  系统截图
* */

const getPixels = require('get-pixels')
const screenShotDesktop = require('screenshot-desktop')
const robot = require('robotjs')
const path = require('path')

// 判断两色是否相近
function isSimilar({r: r1, g: g1, b: b1}, {r: r2, g: g2, b: b2}) {
  return Math.abs(r1 - r2) < 2 && Math.abs(g1 - g2) < 2 && Math.abs(b1 - b2) < 2
}

// 获取图片某一点的RGB通道值
function getRGB(pixels, x, y) {
  let r = pixels.get(x, y, 0) // red
  let g = pixels.get(x, y, 1) // green
  let b = pixels.get(x, y, 2) // blue
  return {r, g, b}
}

// 获取图片数据
function pxData(...args) {
  return new Promise((resolve, reject) => {
    getPixels(...args, (err, pixels) => {
      if (err) {
        reject(err)
        return
      }
      resolve(pixels)
    })
  })
}

// 获取图片上所有相似点坐标
function getSimilarArr(pixels, rgb) {
  const arr = []
  const width = pixels.shape[0]
  const height = pixels.shape[1]
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const color = getRGB(pixels, i, j)
      if (isSimilar(color, rgb)) {
        arr.push([i, j])
      }
    }
  }
  return arr
}

// 给定一个坐标范围，求范围内点的数量
function getRangeCount(range, arrs) {
  // range {x: [], y: []}
  let count = 0
  arrs.forEach(item => {
    const index = item.findIndex(val => {
      return val[0] > range.x[0] && val[0] < range.x[1] && val[1] > range.y[0] && val[1] < range.y[1]
    })
    if (index !== -1) count++
  })
  return count
}

function fishingRod() {
  // 抛出鱼钩
  robot.keyTap(keys[currentKey])
  time = Date.now()
  main()
}

// 主函数，用于判断当前是否有鱼上钩，执行收回操作
async function main() {
  const now = Date.now()
  if (time && now - time > MAX_WAIT_TIME * 1000) {
    // 如果一定时间内仍未钓上鱼，则切换鱼饵快捷键（当前快捷键已无鱼饵或者疲劳已经耗尽）
    currentKey = (currentKey + 1) % keys.length
    fishingRod()
    return
  }
  // 进行系统截图
  const buffer = await screenShotDesktop({format: 'png' })
  const screenshot = await pxData(buffer, 'image/png')
  const arrs = []
  // 在target.png上取5 * 5个点的rgb通道值
  for (let i = 15; i < 20; i++) {
    for (let j = 15; j < 20; j++) {
      const point = getRGB(target, i, j)
      arrs.push(getSimilarArr(screenshot, point))
    }
  }
  // 对截图进行遍历，在给定范围内{x: [-15, 15], y: [-15, 15]}如果出现匹配的点超过15个，则认为匹配成功（即页面上已经出现钓鱼成功的标志）
  const firstArr = arrs[0]
  const countArr = [0]
  const RANG_COUNT = 15
  for (let i = 0; i < firstArr.length; i++) {
    const range = {
      x: [firstArr[i][0] - RANG_COUNT, firstArr[i][0] + RANG_COUNT],
      y: [firstArr[i][1] - RANG_COUNT, firstArr[i][1] + RANG_COUNT]
    }
    const count = getRangeCount(range, arrs)
    countArr.push(count)
  }
  const maxCount = Math.max(...countArr) || 0
  console.log(`图像匹配结果：${maxCount} / 25`)
  if (maxCount >= 15) {
    console.log('匹配成功，收回鱼竿')
    // 按下f收回鱼竿
    robot.keyTap('f')
    // 等待2000毫秒，再次丢出鱼钩
    await sleep(2000)
    fishingRod()
  } else {
    // 当前未有鱼上钩，等待500毫秒后再次执行main函数
    await sleep(500)
    main()
  }
}

function sleep(delay = 800) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, delay)
  })
}

let target
let time
let keys = ['7', '8', '6']
let currentKey = 0
const MAX_WAIT_TIME = 30 // 最大等待时间（秒）
;(async () => {
  target = await pxData(path.join(__dirname, 'target.png'))
  console.log('启动成功，请勿关闭本窗口，将鱼饵放至快捷键“6”，“7”和“8”处，程序会优先使用“7”下的鱼饵，按下“7”，然后就可以挂机了（鱼饵使用顺序7、8、6）')
  await main()
})()
