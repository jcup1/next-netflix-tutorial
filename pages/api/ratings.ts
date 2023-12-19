import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import serverAuth from "@/libs/serverAuth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end();
    }

    const { currentUser } = await serverAuth(req, res);
    const { movieId, ratingValue } = req.body;

    // Retrieve the existing movie data along with its ratings
    const existingMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: { ratings: true },
    });

    if (!existingMovie) {
      throw new Error('Invalid Movie ID');
    }

    // Find the existing rating of the current user
    const existingRating = existingMovie.ratings.find(
      (rating) => rating.userId === currentUser.id
    );

    // Update or create the rating
    let updatedRating;
    if (existingRating) {
      updatedRating = await prisma.rating.update({
        where: { id: existingRating.id },
        data: { value: ratingValue },
      });
    } else {
      updatedRating = await prisma.rating.create({
        data: { value: ratingValue, userId: currentUser.id, movieId: existingMovie.id },
      });
    }

    // Retrieve the movie data again after the rating changes
    const updatedMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: { ratings: true },
    });

    if (!updatedMovie) {
        throw new Error('Invalid Movie ID');
      }
  
    // Recalculate the new average rating
    const totalRating = updatedMovie.ratings.reduce((sum, rating) => sum + rating.value, 0);
    const newAverageRating = totalRating / updatedMovie.ratings.length;

    const responseData = {
      ...updatedMovie,
      ratings: existingRating ? existingMovie.ratings : [...updatedMovie.ratings, updatedRating],
      newAverageRating,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  } finally {
    await prisma.$disconnect();
  }
}
