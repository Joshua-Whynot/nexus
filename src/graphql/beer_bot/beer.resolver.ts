import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DbExecutor } from '../../common/db.executor';
import { BeerService } from './beer.service';
import { Beer, BeerStats } from './beer.types';
import { CreateBeerInput } from './create-beer.input';
import { UpdateBeerInput } from './update-beer.input';

@Resolver(() => Beer)
export class BeerResolver {
    constructor(private readonly beerService: BeerService, private readonly executor: DbExecutor) { }

    @Query(() => Beer, { nullable: true })
    beer(@Args('discordID') discordID: string): any {
        return this.beerService.findOne(discordID);
    }

    @Query(() => [Beer])
    beers(): any[] {
        return this.beerService.findAll();
    }

    @Query(() => BeerStats, { nullable: true })
    beerStats(): any {
        return this.beerService.getStats();
    }

    @Mutation(() => Beer)
    createBeer(@Args('input') input: CreateBeerInput): any {
        const op = this.beerService.createOp(input as any);
        const results = this.executor.apply([op]);
        return results[0];
    }

    @Mutation(() => Beer)
    updateBeer(@Args('discordID') discordID: string, @Args('input') input: UpdateBeerInput): any {
        const op = this.beerService.updateOp(discordID, input as any);
        const results = this.executor.apply([op]);
        return results[0];
    }

    @Mutation(() => Boolean)
    deleteBeer(@Args('discordID') discordID: string): boolean {
        const op = this.beerService.deleteOp(discordID);
        const results = this.executor.apply([op]);
        return results[0] === true;
    }
}

export default BeerResolver;
