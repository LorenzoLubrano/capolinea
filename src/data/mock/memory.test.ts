import { describeRepositoriesContract } from '../testing/repositories-contract';
import { createMemoryRepositories } from './memory';

describeRepositoriesContract('memory repositories', async (dataset) => createMemoryRepositories(dataset, 0));
