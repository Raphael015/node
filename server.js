const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");
const cron = require("node-cron");

const PORT = process.env.PORT || 3000;
const app = express();
const cache = new NodeCache();

const getChannelVideos = async (maxResults = 50) => {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log("Iniciando busca por vídeos...");

      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            channelId: "UCqe-8XY4YV0fyV1PYLJCaog",
            order: "date",
            type: "video",
            maxResults,
            videoDuration: "medium",
            key: "AIzaSyAlAkuWNxTQC3x2hIbTaO3NGaKDXyYhoM0",
          },
        },
      );

      const videos = response.data.items.map((video) => ({
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
      }));

      console.log(`${videos.length} vídeo(s) encontrado(s).`);
      return videos;
    } catch (error) {
      console.error("Erro ao obter dados do vídeo:", error);

      retries++;
      if (retries < maxRetries) {
        const waitTime = 5000;
        console.log(
          `Tentativa ${retries} de ${maxRetries}. Tentando novamente em ${
            waitTime / 1000
          } segundos...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.error("Número máximo de tentativas atingido. Desistindo.");
        throw error;
      }
    }
  }
};

const scheduleUpdate = (cronExpression) => {
  return cron.schedule(cronExpression, async () => {
    try {
      console.log("Atualizando o cache...");
      await updateCache();
    } catch (error) {
      console.error("Erro ao agendar tarefa:", error);
    }
  });
};

const updateCache = async () => {
  try {
    cache.del("videos");

    const videos = await getChannelVideos();
    cache.set("videos", videos);
    console.log("Cache atualizado com sucesso.");
  } catch (error) {
    console.error("Erro ao atualizar o cache:", error);
  }
};

updateCache();

process.env.TZ = "America/Sao_Paulo";

const j1 = scheduleUpdate("55 18 * * *");
const j2 = scheduleUpdate("59 18 * * *");

const renderPageWithVideos = (videos) => {
  return `
    <html>
      <head>
        <title>Vídeos</title>
      </head>
      <body>
        <h1>Vídeos</h1>
        ${
          videos.length > 0
            ? `<ul>${videos
                .map(
                  (video) =>
                    `<li>
                      <h3>${video.title}</h3>
                      <img src="${video.thumbnail}" alt="Thumbnail">
                    </li>`,
                )
                .join("")}</ul>`
            : "<p>Nenhum vídeo encontrado</p>"
        }
      </body>
    </html>
  `;
};

app.get("/", async (req, res) => {
  try {
    const videos = cache.get("videos") || [];
    const html = renderPageWithVideos(videos);
    res.send(html);
  } catch (error) {
    console.error("Erro ao obter dados dos vídeos:", error);
    res.status(500).send("Erro interno do servidor");
  }
});

app.use((req, res) => {
  res.status(404).send("Página não encontrada");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});