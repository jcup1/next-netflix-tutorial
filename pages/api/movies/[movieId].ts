import { NextApiRequest, NextApiResponse } from "next";
import prismadb from '@/libs/prismadb';
import serverAuth from "@/libs/serverAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).end();
    }

    await serverAuth(req, res);

    const { movieId } = req.query;

    if (typeof movieId !== 'string') {
      throw new Error('Invalid Id');
    }

    if (!movieId) {
      throw new Error('Missing Id');
    }

    const movies = await prismadb.movie.findUnique({
      where: {
        id: movieId
      },
      include: {
        ratings: true,
      },
    });

    if (!movies) {
      throw new Error('Invalid Movie ID');
    }

    const totalRating = movies.ratings.reduce(
      (sum, rating) => sum + rating.value,
      0
    );
    const averageRating =
      movies.ratings.length > 0
        ? totalRating / movies.ratings.length
        : null;

    return res.status(200).json({...movies, averageRating});
  } catch (error) {
    console.log(error);
    return res.status(500).end();
  }
}
