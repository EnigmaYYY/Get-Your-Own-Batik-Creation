// 火山引擎视觉API调用
async function generateImageWithVolcanoAPI(prompt) {
    try {
        console.log('使用火山引擎视觉API生成图像...');
        console.log('提示词:', prompt);

        // 添加蜡染风格相关的提示词增强
        const enhancedPrompt = `${prompt}, 蜡染风格, 传统中国蜡染图案, 细节丰富的织物纹理, 鲜艳的颜色, 高质量`;
        console.log('增强后的提示词:', enhancedPrompt);

        // 火山引擎API参数 - 与Python示例保持一致
        const requestData = {
            "req_key": "high_aes_general_v21_L",
            "prompt": enhancedPrompt,
            "req_schedule_conf": "general_v20_9B_pe",
            "llm_seed": -1,
            "seed": -1,
            "scale": 3.5,
            "ddim_steps": 25,
            "width": 512,
            "height": 512,
            "use_pre_llm": true,
            "use_sr": true,
            "return_url": true,
            "negative_prompt": "nsfw, nude, smooth skin, unblemished skin, mole, low resolution, blurry, worst quality, mutated hands and fingers, poorly drawn face, bad anatomy, distorted hands, limbless, 国旗, national flag."
        };

        // 尝试多个CORS代理服务器
        const corsProxies = [
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/',
            'https://api.allorigins.win/raw?url='
        ];

        // 使用与Python示例相同的API URL
        const apiUrl = 'https://visual.volcengineapi.com?Action=CVProcess&Version=2022-08-31';

        // 设置API密钥 - 使用与Python示例相同的密钥
        // 注意：这些密钥与Python示例中的密钥相同，但格式不同
        const ak = 'AKLTZWI3ZmEzZTY2MjEwNDI1ZGFmY2E0Y2Y5Yjg5YmRiN2U';
        const sk = 'TnpobFlUUTNabVE1T1dVM05EWmpNRGxoT1dZNVl6Vm1ZekE1WmpSbU5qUQ==';

        // 解码base64密钥
        let decodedAk, decodedSk;
        try {
            decodedAk = atob(ak);
            decodedSk = atob(sk);
            console.log('成功解码API密钥');
        } catch (decodeError) {
            console.error('解码API密钥失败:', decodeError);
            // 如果解码失败，尝试使用原始密钥
            decodedAk = ak;
            decodedSk = sk;
        }

        // 生成4张图片，每次请求都使用不同的种子值
        const imagePromises = [];

        // 尝试每个CORS代理
        for (const corsProxy of corsProxies) {
            const proxyUrl = corsProxy + encodeURIComponent(apiUrl);
            console.log(`尝试使用CORS代理: ${corsProxy}`);

            // 尝试两种不同的授权方式
            const authMethods = [
                `VOLC-HMAC-SHA256 ${decodedAk}:${decodedSk}`,
                `HMAC-SHA256 ${decodedAk}:${decodedSk}`
            ];

            for (const authMethod of authMethods) {
                console.log(`尝试使用授权方式: ${authMethod.split(' ')[0]}`);

                // 为每个请求使用不同的种子值
                const requestWithSeed = {
                    ...requestData,
                    seed: Math.floor(Math.random() * 1000000) // 随机种子
                };

                const options = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authMethod
                    },
                    body: JSON.stringify(requestWithSeed)
                };

                // 添加到请求队列
                imagePromises.push(
                    (async () => {
                        try {
                            console.log(`发送图像生成请求，种子值: ${requestWithSeed.seed}...`);
                            console.log(`请求URL: ${proxyUrl}`);
                            console.log(`请求头: ${JSON.stringify(options.headers)}`);
                            console.log(`请求体: ${options.body}`);

                            const response = await fetch(proxyUrl, options);

                            // 详细记录响应信息
                            console.log(`响应状态: ${response.status} ${response.statusText}`);
                            console.log(`响应头: ${JSON.stringify(Array.from(response.headers.entries()))}`);

                            if (!response.ok) {
                                const errorText = await response.text();
                                console.error(`API响应状态码错误 (${response.status}):`, errorText);
                                throw new Error(`API调用失败 (${response.status}): ${errorText}`);
                            }

                            const result = await response.json();
                            console.log(`请求响应:`, result);

                            // 检查响应状态
                            if (result.code !== 10000 || !result.data) {
                                throw new Error(`API返回错误: ${result.message || '未知错误'}`);
                            }

                            return result;
                        } catch (error) {
                            console.error(`请求失败:`, error);
                            throw error;
                        }
                    })()
                );

                // 只尝试一次，如果成功就不再尝试其他方法
                try {
                    const result = await Promise.race([
                        imagePromises[imagePromises.length - 1],
                        new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000))
                    ]);

                    // 如果成功，不再尝试其他方法
                    if (result && result.code === 10000 && result.data) {
                        console.log('成功找到有效的API调用方法，停止尝试其他方法');
                        // 清空之前的尝试，只保留成功的那个
                        const successPromise = imagePromises[imagePromises.length - 1];
                        imagePromises.length = 0;
                        imagePromises.push(successPromise);

                        // 再添加3个相同配置的请求，使用不同的种子值
                        for (let i = 0; i < 3; i++) {
                            const newSeed = Math.floor(Math.random() * 1000000);
                            const newRequestWithSeed = {
                                ...requestData,
                                seed: newSeed
                            };

                            const newOptions = {
                                ...options,
                                body: JSON.stringify(newRequestWithSeed)
                            };

                            imagePromises.push(
                                (async () => {
                                    try {
                                        console.log(`发送额外的图像生成请求 #${i+1}，种子值: ${newSeed}...`);
                                        const response = await fetch(proxyUrl, newOptions);

                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            throw new Error(`API调用失败 (${response.status}): ${errorText}`);
                                        }

                                        const result = await response.json();

                                        if (result.code !== 10000 || !result.data) {
                                            throw new Error(`API返回错误: ${result.message || '未知错误'}`);
                                        }

                                        return result;
                                    } catch (error) {
                                        console.error(`额外请求 #${i+1} 失败:`, error);
                                        throw error;
                                    }
                                })()
                            );
                        }

                        // 跳出所有循环
                        break;
                    }
                } catch (error) {
                    console.log(`当前方法失败，尝试下一个方法: ${error.message}`);
                    // 继续尝试下一个方法
                }
            }

            // 如果已经找到有效方法，跳出循环
            if (imagePromises.length === 4) {
                break;
            }
        }

        // 等待所有请求完成，忽略失败的请求
        const results = await Promise.allSettled(imagePromises);
        console.log('收到所有图像生成响应:', results);

        // 提取图像URL
        const imageUrls = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const response = result.value;
                console.log(`处理第${index+1}个成功响应:`, response);

                // 根据返回值示例提取URL
                if (response.data && response.data.image_urls && Array.isArray(response.data.image_urls) && response.data.image_urls.length > 0) {
                    const url = response.data.image_urls[0];
                    if (url) {
                        console.log(`成功提取第${index+1}个图像URL:`, url);
                        imageUrls.push(url);
                    } else {
                        console.error(`第${index+1}个响应中没有找到图像URL`);
                    }
                } else {
                    console.error(`第${index+1}个响应格式不符合预期:`, response);
                }
            } else {
                console.error(`第${index+1}个请求失败:`, result.reason);
            }
        });

        if (imageUrls.length === 0) {
            console.error('未能从API响应中提取图像URL');
            throw new Error('未能生成图像');
        }

        // 如果生成的图片少于8张，复制已有的图片填充到8张
        while (imageUrls.length < 8 && imageUrls.length > 0) {
            const randomIndex = Math.floor(Math.random() * imageUrls.length);
            imageUrls.push(imageUrls[randomIndex]);
        }

        console.log('成功生成图像，URL数量:', imageUrls.length);
        return imageUrls;
    } catch (error) {
        console.error('火山引擎API调用失败:', error);
        throw error;
    }
}

// 导出函数
window.generateImageWithVolcanoAPI = generateImageWithVolcanoAPI;
