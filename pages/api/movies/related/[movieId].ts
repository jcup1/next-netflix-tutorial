import { NextApiRequest, NextApiResponse } from "next";
import prismadb from '@/libs/prismadb';
import serverAuth from "@/libs/serverAuth";
import { Prisma, MovieRelation } from "@prisma/client";

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

      const graphResult = await prismadb.movieRelation.aggregateRaw({
          pipeline: [
            {
              $match: {
                primaryMovieId: movieId
              }
            },
            {
              $graphLookup: {
                from: 'MovieRelation',
                startWith: '$primaryMovieId',
                connectFromField: 'secondaryMovieId',
                connectToField: 'primaryMovieId',
                as: 'relatedMovies',
                // This is how far we go with from movie we go to still consider a movie related. If we set this value to 3 this doesn't mean we get 3 related movies
                // For example, if a movie has 10 direct relations, each of these 10 movies have another 2 related we will get in total 10 + 10 * 2 = 30 movies.                
                maxDepth: 3
              }
            }
          ]
      });

      const relatedIds = (((graphResult as unknown as Prisma.JsonArray)
                            .at(0) as Prisma.JsonObject)
                         .relatedMovies as Array<MovieRelation>)
                         .filter(filtered => filtered != null && filtered.secondaryMovieId != null)
                         .map(obj => obj.secondaryMovieId)

      const relatedMoviesDetails = await prismadb.movie.findMany({
        where: {
          id: {
            in: relatedIds
          }
        }
      });      

      return res.status(200).json(relatedMoviesDetails);
    } catch (error) {
      console.log(error);
      return res.status(500).end();
    }
  }