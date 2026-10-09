import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateWhitelistInput } from './create-whitelist.input';
import { WhitelistService } from './whitelist.service';
import { WhitelistEntry } from './whitelist.types';

@Resolver(() => WhitelistEntry)
export class WhitelistResolver {
    constructor(private readonly whitelistService: WhitelistService) { }

    @Query(() => [WhitelistEntry])
    whitelistEntries(): any[] {
        return this.whitelistService.findAll();
    }

    @Mutation(() => WhitelistEntry)
    createWhitelist(@Args('input') input: CreateWhitelistInput): any {
        return this.whitelistService.createWhitelist(input as any);
    }
}

export default WhitelistResolver;
