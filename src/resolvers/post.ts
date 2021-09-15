import { User } from './../entities/User';
import { Post } from "./../entities/Post";
import { MyContext, FieldError } from "./../types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { QueryOrder } from "@mikro-orm/core";
import { slugify } from "transliteration";
import { isAuth } from '../middleware/isAuth';

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  metaTitle: string;
  @Field()
  content: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  total: number;
}

@ObjectType()
class DeletePost {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
  @Field(() => Boolean, { nullable: true })
  status: boolean;
}

/** Need Impl */
@Resolver()
export class PostResolver {
  @Query(() => PaginatedPosts, { nullable: true })
  async posts(
    @Arg("pageIndex", () => Int) pageIndex: number,
    @Arg("pageSize", () => Int) pageSize: number,
    @Ctx() { em }: MyContext
  ): Promise<PaginatedPosts> {
    const offset = pageSize * pageIndex;

    let posts = await em.find(
      Post,
      {},
      {
        orderBy: { createdAt: QueryOrder.ASC },
        limit: pageSize,
        offset: offset,
      }
    );

    const total = await em.count(Post);

    return {
      total,
      posts,
    };
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(@Arg("input") input: PostInput, @Ctx() { em, userId }: MyContext) {
    const author = await em.findOne(User, {id: userId});
    const post = em.create(Post, { ...input, slug: slugify(input.title), author });
    await em.persistAndFlush(post);
    return post;
  }

  @Mutation(() => DeletePost)
  async deletePost(
    @Arg("id") id: string,
    @Ctx() { em }: MyContext
  ) : Promise<DeletePost>{
    const post = await em.findOne(Post, { id });
    if (post) {
      await em.removeAndFlush(post);
      return {
        status: true
      }
    } else {
      return {
        errors: [
          {
            field: 'id',
            message: 'not exist'
          }
        ],
        status: false
      }
    }
  }
}
