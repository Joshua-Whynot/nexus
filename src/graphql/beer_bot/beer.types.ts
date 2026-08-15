import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Beer {
    @Field(() => Int)
    id: number;

    @Field()
    discordID: string;

    @Field({ nullable: true })
    discordUser?: string | null;

    @Field(() => Int)
    count: number;
}

@ObjectType()
export class BeerStats {
    @Field(() => Int)
    id: 1;

    @Field(() => Int)
    total: number;

    @Field({ nullable: true })
    lastUpdated: string | null;
}
